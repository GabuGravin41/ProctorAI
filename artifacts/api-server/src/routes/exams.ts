import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, examsTable, questionsTable, examSessionsTable, cheatingFlagsTable, usersTable } from "../db";
import { eq, and, sql, count, or } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
};

function formatExam(exam: any, questionCount = 0, sessionCount = 0, flagCount = 0, instructorName?: string, institutionName?: string) {
  return {
    id: exam.id,
    title: exam.title,
    description: exam.description ?? null,
    status: exam.status,
    durationMinutes: exam.durationMinutes,
    gradingMode: exam.gradingMode,
    aiConfig: exam.aiConfig,
    subject: exam.subject ?? null,
    topic: exam.topic ?? null,
    tags: Array.isArray(exam.tags) ? exam.tags : [],
    instructorClerkId: exam.instructorClerkId,
    instructorName: instructorName ?? null,
    institutionName: institutionName ?? null,
    accessCode: exam.accessCode ?? null,
    isPublic: exam.isPublic ?? false,
    collaborators: exam.collaborators ?? [],
    questionCount,
    sessionCount,
    flagCount,
    createdAt: exam.createdAt.toISOString(),
    updatedAt: exam.updatedAt.toISOString(),
  };
}

// GET /api/exams
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const { status } = req.query;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user) return res.status(404).json({ error: "User not found" });

    const exams = await db.select().from(examsTable).where(
      or(
        eq(examsTable.instructorClerkId, clerkId),
        sql`coalesce(${examsTable.collaborators}, '[]'::jsonb) @> ${JSON.stringify([user.email])}::jsonb`
      )
    );
    const filtered = status ? exams.filter((e) => e.status === status) : exams;

    const result = await Promise.all(
      filtered.map(async (exam) => {
        const [qCount] = await db.select({ count: count() }).from(questionsTable).where(eq(questionsTable.examId, exam.id));
        const [sCount] = await db.select({ count: count() }).from(examSessionsTable).where(eq(examSessionsTable.examId, exam.id));
        const sessions = await db.select({ id: examSessionsTable.id }).from(examSessionsTable).where(eq(examSessionsTable.examId, exam.id));
        let fCount = 0;
        for (const s of sessions) {
          const [fc] = await db.select({ count: count() }).from(cheatingFlagsTable).where(eq(cheatingFlagsTable.sessionId, s.id));
          fCount += fc.count;
        }
        return formatExam(exam, qCount.count, sCount.count, fCount);
      })
    );
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "listExams error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/exams
router.post("/", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const { title, description, subject, topic, tags, isPublic, durationMinutes, gradingMode, aiConfig } = req.body;
    const [exam] = await db
      .insert(examsTable)
      .values({ 
        title, 
        description, 
        subject, 
        topic: topic ?? null,
        tags: Array.isArray(tags) ? tags : [],
        isPublic: !!isPublic,
        durationMinutes: durationMinutes ?? 60, 
        gradingMode: gradingMode ?? "review_release", 
        aiConfig: aiConfig ?? { provider: "free", model: "google/gemma-2-9b-it:free" },
        instructorClerkId: clerkId 
      })
      .returning();
    res.status(201).json(formatExam(exam));
  } catch (err) {
    req.log.error({ err }, "createExam error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/exams/public
router.get("/public", requireAuth, async (req: any, res) => {
  try {
    const exams = await db
      .select()
      .from(examsTable)
      .where(and(eq(examsTable.isPublic, true), eq(examsTable.status, "published")));

    const result = await Promise.all(
      exams.map(async (exam) => {
        const [qCount] = await db.select({ count: count() }).from(questionsTable).where(eq(questionsTable.examId, exam.id));
        const [sCount] = await db.select({ count: count() }).from(examSessionsTable).where(eq(examSessionsTable.examId, exam.id));
        const [instructor] = await db.select().from(usersTable).where(eq(usersTable.clerkId, exam.instructorClerkId));
        return formatExam(exam, qCount.count, sCount.count, 0, instructor?.name ?? "Instructor", instructor?.institutionName ?? undefined);
      })
    );
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "listPublicExams error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/exams/:examId
router.get("/:examId", requireAuth, async (req: any, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, examId)).orderBy(questionsTable.order);

    res.json({
      ...formatExam(exam, questions.length),
      questions: questions.map((q) => ({
        id: q.id,
        examId: q.examId,
        type: q.type,
        text: q.text,
        options: q.options ?? null,
        correctAnswer: q.correctAnswer ?? null,
        referenceSolution: q.referenceSolution ?? null,
        points: q.points,
        order: q.order,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "getExam error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/exams/:examId
router.patch("/:examId", requireAuth, async (req: any, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const clerkId = req.clerkUserId;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    const isAdmin = user && user.email === "daltonomondi04@gmail.com";

    const { title, description, subject, topic, tags, isPublic, durationMinutes, gradingMode, status, aiConfig, collaborators } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (subject !== undefined) updates.subject = subject;
    if (topic !== undefined) updates.topic = topic;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
    if (isPublic !== undefined) updates.isPublic = !!isPublic;
    if (durationMinutes !== undefined) updates.durationMinutes = durationMinutes;
    if (gradingMode !== undefined) updates.gradingMode = gradingMode;
    if (status !== undefined) updates.status = status;
    if (aiConfig !== undefined) updates.aiConfig = aiConfig;
    if (collaborators !== undefined) updates.collaborators = collaborators;

    const queryCond = isAdmin
      ? eq(examsTable.id, examId)
      : and(eq(examsTable.id, examId), eq(examsTable.instructorClerkId, clerkId));

    const [exam] = await db.update(examsTable).set(updates).where(queryCond).returning();
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    res.json(formatExam(exam));
  } catch (err) {
    req.log.error({ err }, "updateExam error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/exams/:examId
router.delete("/:examId", requireAuth, async (req: any, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const clerkId = req.clerkUserId;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    const isAdmin = user && user.email === "daltonomondi04@gmail.com";

    const queryCond = isAdmin
      ? eq(examsTable.id, examId)
      : and(eq(examsTable.id, examId), eq(examsTable.instructorClerkId, clerkId));

    await db.delete(examsTable).where(queryCond);
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "deleteExam error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/exams/:examId/publish
router.post("/:examId/publish", requireAuth, async (req: any, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const clerkId = req.clerkUserId;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    const isAdmin = user && user.email === "daltonomondi04@gmail.com";

    // Generate a unique 8-character uppercase access code
    let code: string = "";
    let attempts = 0;
    while (true) {
      code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const existing = await db.select({ id: examsTable.id }).from(examsTable).where(eq(examsTable.accessCode, code));
      if (existing.length === 0 || attempts > 10) break;
      attempts++;
    }

    const queryCond = isAdmin
      ? eq(examsTable.id, examId)
      : and(eq(examsTable.id, examId), eq(examsTable.instructorClerkId, clerkId));

    const [exam] = await db
      .update(examsTable)
      .set({ 
        status: "published", 
        accessCode: code,
        updatedAt: new Date() 
      })
      .where(queryCond)
      .returning();

    if (!exam) return res.status(404).json({ error: "Exam not found" });

    res.json({
      exam: formatExam(exam),
      accessCode: code,
    });
  } catch (err) {
    req.log.error({ err }, "publishExam error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/exams/:examId/results
router.get("/:examId/results", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const examId = parseInt(req.params.examId);
    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user) return res.status(404).json({ error: "User not found" });

    const isOwner = exam.instructorClerkId === clerkId;
    const isCollab = exam.collaborators && Array.isArray(exam.collaborators) && exam.collaborators.includes(user.email);
    const isAdmin = user.email === "daltonomondi04@gmail.com";
    if (!isOwner && !isCollab && !isAdmin) return res.status(403).json({ error: "Forbidden" });

    const sessions = await db.select().from(examSessionsTable).where(eq(examSessionsTable.examId, examId));

    let totalFlags = 0;
    let totalScore = 0;
    let submittedCount = 0;

    const sessionsWithFlags = await Promise.all(
      sessions.map(async (s) => {
        const flags = await db.select().from(cheatingFlagsTable).where(eq(cheatingFlagsTable.sessionId, s.id));
        totalFlags += flags.length;
        if (s.status === "submitted" && s.score !== null) {
          totalScore += s.score;
          submittedCount++;
        }
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
          flagCount: flags.length,
          startedAt: s.startedAt?.toISOString() ?? null,
          submittedAt: s.submittedAt?.toISOString() ?? null,
          createdAt: s.createdAt.toISOString(),
        };
      })
    );

    res.json({
      exam: formatExam(exam, 0, sessions.length, totalFlags),
      sessions: sessionsWithFlags,
      totalFlags,
      avgScore: submittedCount > 0 ? totalScore / submittedCount : 0,
      submittedCount,
    });
  } catch (err) {
    req.log.error({ err }, "getExamResults error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/exams/:examId/access-codes
router.get("/:examId/access-codes", requireAuth, async (req: any, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const clerkId = req.clerkUserId;

    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user) return res.status(404).json({ error: "User not found" });

    const isOwner = exam.instructorClerkId === clerkId;
    const isCollab = exam.collaborators && Array.isArray(exam.collaborators) && exam.collaborators.includes(user.email);
    if (!isOwner && !isCollab) return res.status(403).json({ error: "Forbidden" });

    const sessions = await db
      .select({
        accessCode: examSessionsTable.accessCode,
        studentEmail: examSessionsTable.studentEmail,
        status: examSessionsTable.status,
      })
      .from(examSessionsTable)
      .where(eq(examSessionsTable.examId, examId));

    res.json(sessions.map((s) => ({
      code: s.accessCode,
      studentEmail: s.studentEmail ?? "",
      status: s.status,
    })));
  } catch (err) {
    req.log.error({ err }, "getAccessCodes error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/exams/:examId/live-status
router.get("/:examId/live-status", requireAuth, async (req: any, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const clerkId = req.clerkUserId;

    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user) return res.status(404).json({ error: "User not found" });

    // Auth check: owner or collaborator
    const isOwner = exam.instructorClerkId === clerkId;
    const isCollaborator = exam.collaborators && Array.isArray(exam.collaborators) && exam.collaborators.includes(user.email);
    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const sessions = await db.select().from(examSessionsTable).where(eq(examSessionsTable.examId, examId));
    const questions = await db.select({ id: questionsTable.id }).from(questionsTable).where(eq(questionsTable.examId, examId));
    const totalQuestions = questions.length;

    let activeCount = 0;
    let submittedCount = 0;
    let notStartedCount = 0;
    let urgentFlagsCount = 0;

    const students = await Promise.all(
      sessions.map(async (s) => {
        const flags = await db.select().from(cheatingFlagsTable).where(eq(cheatingFlagsTable.sessionId, s.id));
        const answers = await db.select().from(answersTable).where(eq(answersTable.sessionId, s.id));
        const nonNullAnswers = answers.filter((a) => a.answer && a.answer.trim() !== "");

        if (s.status === "active" || s.status === "in_progress") activeCount++;
        else if (s.status === "submitted" || s.status === "completed") submittedCount++;
        else notStartedCount++;

        const pendingFlags = flags.filter((f) => f.reviewStatus === "pending");
        if (pendingFlags.length >= 3) urgentFlagsCount++;

        const lastFlag = flags.length > 0 ? flags[flags.length - 1] : null;

        return {
          sessionId: s.id,
          studentName: s.studentName || "Student",
          studentEmail: s.studentEmail || "",
          status: s.status,
          questionsAnswered: nonNullAnswers.length,
          totalQuestions,
          flagCount: flags.length,
          pendingFlagCount: pendingFlags.length,
          lastFlagType: lastFlag ? lastFlag.type : null,
          startedAt: s.startedAt ? s.startedAt.toISOString() : null,
          submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null,
        };
      })
    );

    res.json({
      exam: {
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        durationMinutes: exam.durationMinutes,
        status: exam.status,
      },
      summary: {
        total: sessions.length,
        active: activeCount,
        submitted: submittedCount,
        notStarted: notStartedCount,
        urgentFlags: urgentFlagsCount,
      },
      students,
    });
  } catch (err) {
    req.log.error({ err }, "getLiveStatus error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/exams/:examId/collaborators
router.patch("/:examId/collaborators", requireAuth, async (req: any, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const clerkId = req.clerkUserId;
    const { collaborators } = req.body; // Array of email strings

    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    // Only creator/owner can manage collaborators
    if (exam.instructorClerkId !== clerkId) {
      return res.status(403).json({ error: "Only the exam creator can manage collaborators" });
    }

    const [updated] = await db
      .update(examsTable)
      .set({ collaborators, updatedAt: new Date() })
      .where(eq(examsTable.id, examId))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "updateCollaborators error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
