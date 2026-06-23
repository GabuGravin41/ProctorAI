import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, examSessionsTable, examsTable, questionsTable, answersTable, cheatingFlagsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

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
        return formatSession(s, flags.length);
      })
    );
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "listSessions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/sessions/join
router.post("/join", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const { accessCode } = req.body;

    // Try to find existing session with this access code for this student
    let [session] = await db.select().from(examSessionsTable).where(
      and(eq(examSessionsTable.accessCode, accessCode.toUpperCase()), eq(examSessionsTable.studentClerkId, clerkId))
    );

    // If no session exists, create one with the access code
    if (!session) {
      // Find an exam to attach this to (simplified: access code is exam ID encoded)
      // In a real system this would look up a pre-created access code
      // For now, create a new session with this code
      const exams = await db.select().from(examsTable).where(eq(examsTable.status, "published"));
      if (exams.length === 0) return res.status(404).json({ error: "No published exam found for this code" });

      const exam = exams[0];
      [session] = await db
        .insert(examSessionsTable)
        .values({ examId: exam.id, studentClerkId: clerkId, accessCode: accessCode.toUpperCase(), status: "pending" })
        .returning();
    }

    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, session.examId));
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, exam.id)).orderBy(questionsTable.orderIndex);

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
          correctAnswer: null, // hide from student
          points: q.points,
          orderIndex: q.orderIndex,
        })),
      },
    });
  } catch (err) {
    req.log.error({ err }, "joinExam error");
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

    const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, exam.id)).orderBy(questionsTable.orderIndex);
    const flags = await db.select().from(cheatingFlagsTable).where(eq(cheatingFlagsTable.sessionId, sessionId));

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
          orderIndex: q.orderIndex,
        })),
      },
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

    let score = 0;
    const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
    const answerResults = [];

    for (const answerInput of answers) {
      const question = questions.find((q) => q.id === answerInput.questionId);
      if (!question) continue;

      const isCorrect =
        question.type === "short_answer" || question.type === "essay"
          ? true // auto-full-credit for open-ended
          : question.correctAnswer?.toLowerCase() === answerInput.answer?.toLowerCase();

      const points = isCorrect ? question.points : 0;
      score += points;

      await db.insert(answersTable).values({
        sessionId,
        questionId: answerInput.questionId,
        answer: answerInput.answer,
        isCorrect: isCorrect ? 1 : 0,
        points,
      });

      answerResults.push({
        questionId: answerInput.questionId,
        answer: answerInput.answer,
        isCorrect,
        points,
        correctAnswer: question.correctAnswer ?? null,
      });
    }

    const [updatedSession] = await db
      .update(examSessionsTable)
      .set({ status: "submitted", score, maxScore, submittedAt: new Date() })
      .where(eq(examSessionsTable.id, sessionId))
      .returning();

    const flags = await db.select().from(cheatingFlagsTable).where(eq(cheatingFlagsTable.sessionId, sessionId));

    res.json({
      session: formatSession(updatedSession, flags.length),
      score,
      maxScore,
      percentage: maxScore > 0 ? (score / maxScore) * 100 : 0,
      answers: answerResults,
    });
  } catch (err) {
    req.log.error({ err }, "submitSession error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
