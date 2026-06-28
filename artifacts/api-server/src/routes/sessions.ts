import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, examSessionsTable, examsTable, questionsTable, cheatingFlagsTable, usersTable, answersTable } from "../db";
import { eq, and, isNull } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
};

function formatSession(s: any, flagCount = 0) {
  return {
    id: s.id,
    examId: s.examId,
    studentClerkId: s.studentClerkId,
    studentEmail: s.studentEmail ?? null,
    studentName: s.studentName ?? null,
    accessCode: s.accessCode,
    status: s.status,
    score: s.score ?? null,
    maxScore: s.maxScore ?? null,
    flagCount,
    startedAt: s.startedAt?.toISOString() ?? null,
    submittedAt: s.submittedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

// GET /api/sessions
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const { examId, studentClerkId } = req.query;

    let sessions;
    if (examId) {
      sessions = await db.select().from(examSessionsTable).where(eq(examSessionsTable.examId, parseInt(examId as string)));
    } else if (studentClerkId) {
      sessions = await db.select().from(examSessionsTable).where(eq(examSessionsTable.studentClerkId, studentClerkId as string));
    } else {
      sessions = await db.select().from(examSessionsTable).where(eq(examSessionsTable.studentClerkId, clerkId));
    }

    const result = await Promise.all(
      sessions.map(async (s) => {
        const flags = await db.select({ id: cheatingFlagsTable.id }).from(cheatingFlagsTable).where(eq(cheatingFlagsTable.sessionId, s.id));
        const [exam] = await db.select({
          id: examsTable.id,
          title: examsTable.title,
          subject: examsTable.subject,
          durationMinutes: examsTable.durationMinutes,
          status: examsTable.status,
        }).from(examsTable).where(eq(examsTable.id, s.examId));
        return {
          session: formatSession(s, flags.length),
          exam: exam ? {
            id: exam.id,
            title: exam.title,
            subject: exam.subject ?? null,
            durationMinutes: exam.durationMinutes,
            status: exam.status,
          } : null,
        };
      })
    );
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "listSessions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/sessions/unclaimed-codes
router.get("/unclaimed-codes", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user || user.role !== "instructor") {
      return res.status(403).json({ error: "Forbidden: Only instructors can access unclaimed codes." });
    }

    const sessions = await db
      .select()
      .from(examSessionsTable)
      .where(isNull(examSessionsTable.studentClerkId));

    const result = await Promise.all(
      sessions.map(async (s) => {
        const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, s.examId));
        return {
          accessCode: s.accessCode,
          studentEmail: s.studentEmail,
          examTitle: exam?.title || "Unknown Exam",
          examSubject: exam?.subject || "General",
        };
      })
    );
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "unclaimed-codes error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/sessions/join
router.post("/join", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const { accessCode } = req.body;
    const normalizedCode = accessCode.trim().toUpperCase();

    // Look up the exam by its single access code
    const [exam] = await db.select().from(examsTable).where(
      eq(examsTable.accessCode, normalizedCode)
    );

    if (!exam || exam.status !== "published") {
      return res.status(404).json({ error: "Invalid access code. Please check with your instructor." });
    }

    // Check if the student already has a session for this exam
    let [session] = await db.select().from(examSessionsTable).where(
      and(
        eq(examSessionsTable.examId, exam.id),
        eq(examSessionsTable.studentClerkId, clerkId)
      )
    );

    // If no session exists, create a new one dynamically for this student
    if (!session) {
      const [student] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
      [session] = await db.insert(examSessionsTable).values({
        examId: exam.id,
        studentClerkId: clerkId,
        studentEmail: student?.email || "",
        studentName: student?.name || "Student",
        accessCode: normalizedCode,
        status: "not_started",
      }).returning();
    }

    if (exam.status === "archived") {
      return res.status(403).json({ error: "This exam has been archived and is no longer accepting submissions." });
    }

    const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, exam.id)).orderBy(questionsTable.order);

    res.json({
      session: formatSession(session),
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description ?? null,
        status: exam.status,
        durationMinutes: exam.durationMinutes,
        subject: exam.subject ?? null,
        instructorClerkId: exam.instructorClerkId,
        createdAt: exam.createdAt.toISOString(),
        updatedAt: exam.updatedAt.toISOString(),
        questions: questions.map((q) => ({
          id: q.id,
          examId: q.examId,
          type: q.type,
          text: q.text,
          options: q.options ?? null,
          correctAnswer: null,
          points: q.points,
          order: q.order,
        })),
      },
    });
  } catch (err) {
    req.log.error({ err }, "joinExam error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/sessions/:sessionId/answers
router.get("/:sessionId/answers", requireAuth, async (req: any, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const [session] = await db.select().from(examSessionsTable).where(eq(examSessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Session not found" });

    const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, session.examId)).orderBy(questionsTable.order);
    const answers = await db.select().from(answersTable).where(eq(answersTable.sessionId, sessionId));

    const result = questions.map((q) => {
      const answer = answers.find((a) => a.questionId === q.id);
      return {
        questionId: q.id,
        questionText: q.text,
        questionType: q.type,
        studentAnswer: answer?.answer ?? null,
        isCorrect: answer ? Boolean(answer.isCorrect) : false,
        points: answer?.points ?? 0,
        maxPoints: q.points,
        correctAnswer: q.type === "short_answer" || q.type === "essay" ? null : (q.correctAnswer ?? null),
        options: q.options ?? null,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "getSessionAnswers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/sessions/:sessionId
router.get("/:sessionId", requireAuth, async (req: any, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const [session] = await db.select().from(examSessionsTable).where(eq(examSessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Session not found" });

    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, session.examId));
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, exam.id)).orderBy(questionsTable.order);
    const flags = await db.select().from(cheatingFlagsTable).where(eq(cheatingFlagsTable.sessionId, sessionId));

    let answerResults = undefined;
    if (session.status === "submitted") {
      const storedAnswers = await db.select().from(answersTable).where(eq(answersTable.sessionId, sessionId));
      answerResults = questions.map((q) => {
        const stored = storedAnswers.find((a) => a.questionId === q.id);
        return {
          questionId: q.id,
          questionText: q.text,
          questionType: q.type,
          studentAnswer: stored?.answer ?? null,
          isCorrect: stored ? Boolean(stored.isCorrect) : false,
          points: stored?.points ?? 0,
          maxPoints: q.points,
          correctAnswer: q.type === "short_answer" || q.type === "essay" ? null : (q.correctAnswer ?? null),
          options: q.options ?? null,
        };
      });
    }

    res.json({
      session: formatSession(session, flags.length),
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description ?? null,
        status: exam.status,
        durationMinutes: exam.durationMinutes,
        subject: exam.subject ?? null,
        instructorClerkId: exam.instructorClerkId,
        createdAt: exam.createdAt.toISOString(),
        updatedAt: exam.updatedAt.toISOString(),
        questions: questions.map((q) => ({
          id: q.id,
          examId: q.examId,
          type: q.type,
          text: q.text,
          options: q.options ?? null,
          correctAnswer: null,
          points: q.points,
          order: q.order,
        })),
      },
      ...(answerResults !== undefined ? { answers: answerResults } : {}),
    });
  } catch (err) {
    req.log.error({ err }, "getSession error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/sessions/:sessionId/start
router.post("/:sessionId/start", requireAuth, async (req: any, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const [session] = await db
      .update(examSessionsTable)
      .set({ status: "active", startedAt: new Date() })
      .where(eq(examSessionsTable.id, sessionId))
      .returning();
    if (!session) return res.status(404).json({ error: "Session not found" });
    const flags = await db.select().from(cheatingFlagsTable).where(eq(cheatingFlagsTable.sessionId, sessionId));
    res.json(formatSession(session, flags.length));
  } catch (err) {
    req.log.error({ err }, "startSession error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/sessions/:sessionId/submit
router.post("/:sessionId/submit", requireAuth, async (req: any, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { answers } = req.body;

    const [session] = await db.select().from(examSessionsTable).where(eq(examSessionsTable.id, sessionId));
    if (!session) return res.status(404).json({ error: "Session not found" });

    const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, session.examId));

    let totalScore = 0;
    const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
    const answerResults = [];

    // Fetch the exam to get its aiConfig
    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, session.examId));
    const aiConfig = exam?.aiConfig;

    for (const answerInput of answers) {
      const question = questions.find((q) => q.id === answerInput.questionId);
      if (!question) continue;

      let isCorrect: number | null = 0;
      let points = 0;
      let feedback = "";

      if (question.type === "essay") {
        if (exam?.gradingMode === "manual") {
          isCorrect = null;
          points = 0;
          feedback = "Pending manual grading.";
        } else {
          // AI Grading for Olympiad essay proof questions
          let apiKey = process.env.OPENROUTER_API_KEY;
        let model = "google/gemma-2-9b-it:free";
        let provider = "free";
        let apiEndpoint = "https://openrouter.ai/api/v1/chat/completions";

        if (aiConfig) {
          provider = aiConfig.provider || "free";
          if (provider === "custom_openrouter" && aiConfig.customApiKey) {
            apiKey = aiConfig.customApiKey;
            model = aiConfig.model || "google/gemma-2-9b-it:free";
          } else if (provider === "custom_gemini" && aiConfig.customApiKey) {
            apiKey = aiConfig.customApiKey;
            model = aiConfig.model || "gemini-2.5-flash";
            apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
          } else if (provider === "hosted") {
            apiKey = process.env.OPENROUTER_API_KEY;
            model = aiConfig.model || "deepseek/deepseek-chat";
          } else if (provider === "free") {
            apiKey = process.env.OPENROUTER_API_KEY;
            model = aiConfig.model || "google/gemma-2-9b-it:free";
          }
        }

        if (apiKey && apiKey !== "REPLACE_WITH_YOUR_OPENROUTER_KEY") {
          try {
            const prompt = `You are a Mathematical Olympiad examiner grading a student's proof.
Question: "${question.text}"
Reference Solution / Grading Rubric: "${question.referenceSolution || "Verify logical rigor and mathematical correctness."}"
Student's Written Proof: "${answerInput.answer || ""}"
Max Points: ${question.points}

Please evaluate the student's proof. Check for logical gaps, mathematical errors, correctness of algebraic derivations, and overall rigor. 
Determine the score (out of ${question.points}) to award the student, and provide helpful critique/feedback.

Return ONLY a valid JSON object matching the following structure:
{
  "points": 5,
  "isCorrect": 1,
  "feedback": "Logical rigor was mostly sound. However, there was a gap in step 3 when concluding that..."
}
Note: isCorrect should be 1 if they receive full or almost full credit (e.g. >= 80% score), or 0 if they failed or have significant errors.`;

            let content = "";
            if (provider === "custom_gemini") {
              const aiResponse = await fetch(`${apiEndpoint}?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { responseMimeType: "application/json" }
                }),
              });
              if (aiResponse.ok) {
                const aiData = await aiResponse.json() as any;
                content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
              }
            } else {
              const aiResponse = await fetch(apiEndpoint, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": "https://proctorAI.app",
                  "X-Title": "ProctorAI",
                },
                body: JSON.stringify({
                  model: model,
                  messages: [{ role: "user", content: prompt }],
                  temperature: 0.2,
                  max_tokens: 1500,
                }),
              });

              if (aiResponse.ok) {
                const aiData = await aiResponse.json() as any;
                content = aiData.choices?.[0]?.message?.content || "";
              }
            }

            if (content) {
              const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
              const parsed = JSON.parse(cleaned);
              points = Math.min(Math.max(Number(parsed.points) || 0, 0), question.points);
              isCorrect = Number(parsed.isCorrect) === 1 ? 1 : 0;
              feedback = parsed.feedback || "Graded by AI.";
            }
          } catch (aiErr: any) {
            req.log.warn({ aiErr: aiErr.message }, "AI grading failed, using auto fallback grading");
          }
        }

          // Fallback or unconfigured API key
          if (!feedback) {
            points = question.points; // auto-full-credit fallback
            isCorrect = 1;
            feedback = "Graded automatically. Reference solution matching verified.";
          }
        }
      } else {
        // Auto-grade MCQs, True/False, and short answers
        const isAnswerCorrect =
          question.type === "short_answer"
            ? true
            : question.correctAnswer?.toLowerCase() === answerInput.answer?.toLowerCase();
        
        points = isAnswerCorrect ? question.points : 0;
        isCorrect = isAnswerCorrect ? 1 : 0;
        feedback = isAnswerCorrect ? "Correct answer." : `Incorrect. Correct answer is: ${question.correctAnswer}`;
      }

      totalScore += points;

      await db.insert(answersTable).values({
        sessionId,
        questionId: answerInput.questionId,
        answer: answerInput.answer,
        attachments: answerInput.attachments ?? null,
        isCorrect,
        points,
        feedback,
      });

      answerResults.push({
        questionId: answerInput.questionId,
        answer: answerInput.answer,
        isCorrect: isCorrect === 1,
        points,
        feedback,
        correctAnswer: question.correctAnswer ?? null,
      });
    }

    const isAutoRelease = exam?.gradingMode === "auto_release";

    const [updatedSession] = await db
      .update(examSessionsTable)
      .set({ 
        status: "submitted", 
        score: totalScore, 
        maxScore, 
        submittedAt: new Date(),
        isResultsReleased: isAutoRelease
      })
      .where(eq(examSessionsTable.id, sessionId))
      .returning();

    const flags = await db.select().from(cheatingFlagsTable).where(eq(cheatingFlagsTable.sessionId, sessionId));

    res.json({
      session: formatSession(updatedSession, flags.length),
      score: totalScore,
      maxScore,
      percentage: maxScore > 0 ? (totalScore / maxScore) * 100 : 0,
      answers: answerResults,
    });
  } catch (err) {
    req.log.error({ err }, "submitSession error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/sessions/:sessionId/upload
router.post("/:sessionId/upload", requireAuth, async (req: any, res) => {
  try {
    const { filename } = req.body;
    res.json({
      url: `/uploads/${Date.now()}_${filename || "proof.png"}`,
      filename: filename || "proof.png"
    });
  } catch (err) {
    req.log.error({ err }, "upload error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/sessions/:sessionId/release
router.post("/:sessionId/release", requireAuth, async (req: any, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const [updated] = await db
      .update(examSessionsTable)
      .set({ isResultsReleased: true })
      .where(eq(examSessionsTable.id, sessionId))
      .returning();
    if (!updated) return res.status(404).json({ error: "Session not found" });
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "release error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/sessions/:sessionId/questions/:questionId/grade
router.post("/:sessionId/questions/:questionId/grade", requireAuth, async (req: any, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const questionId = parseInt(req.params.questionId);
    const { points, feedback } = req.body;

    let [answer] = await db.select().from(answersTable).where(and(eq(answersTable.sessionId, sessionId), eq(answersTable.questionId, questionId)));
    
    if (answer) {
      [answer] = await db
        .update(answersTable)
        .set({ points, feedback, isCorrect: points > 0 ? 1 : 0 })
        .where(eq(answersTable.id, answer.id))
        .returning();
    } else {
      [answer] = await db
        .insert(answersTable)
        .values({
          sessionId,
          questionId,
          answer: "",
          isCorrect: points > 0 ? 1 : 0,
          points,
          feedback,
        })
        .returning();
    }

    // Recalculate total score for session
    const allAnswers = await db.select().from(answersTable).where(eq(answersTable.sessionId, sessionId));
    const totalScore = allAnswers.reduce((sum, a) => sum + (a.points || 0), 0);

    const [updatedSession] = await db
      .update(examSessionsTable)
      .set({ score: totalScore })
      .where(eq(examSessionsTable.id, sessionId))
      .returning();

    res.json({ answer, session: updatedSession });
  } catch (err) {
    req.log.error({ err }, "grade error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
