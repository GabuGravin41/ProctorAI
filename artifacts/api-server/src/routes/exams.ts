import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, examsTable, questionsTable, examSessionsTable, cheatingFlagsTable } from "@workspace/db";
import { eq, and, sql, count } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
};

function formatExam(exam: any, questionCount = 0, sessionCount = 0, flagCount = 0) {
  return {
    id: exam.id,
    title: exam.title,
    description: exam.description ?? null,
    status: exam.status,
    durationMinutes: exam.durationMinutes,
    gradingMode: exam.gradingMode,
    aiConfig: exam.aiConfig,
    subject: exam.subject ?? null,
    instructorClerkId: exam.instructorClerkId,
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
    let query = db.select().from(examsTable).where(eq(examsTable.instructorClerkId, clerkId));
    const exams = await query;
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
    const { title, description, subject, durationMinutes, gradingMode, aiConfig } = req.body;
    const [exam] = await db
      .insert(examsTable)
      .values({ 
        title, 
        description, 
        subject, 
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

// GET /api/exams/:examId
router.get("/:examId", requireAuth, async (req: any, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, examId)).orderBy(questionsTable.orderIndex);

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
        orderIndex: q.orderIndex,
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
    const { title, description, subject, durationMinutes, gradingMode, status, aiConfig } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (subject !== undefined) updates.subject = subject;
    if (durationMinutes !== undefined) updates.durationMinutes = durationMinutes;
    if (gradingMode !== undefined) updates.gradingMode = gradingMode;
    if (status !== undefined) updates.status = status;
    if (aiConfig !== undefined) updates.aiConfig = aiConfig;

    const [exam] = await db.update(examsTable).set(updates).where(and(eq(examsTable.id, examId), eq(examsTable.instructorClerkId, clerkId))).returning();
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
    await db.delete(examsTable).where(and(eq(examsTable.id, examId), eq(examsTable.instructorClerkId, clerkId)));
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
    const { studentEmails } = req.body;

    const [exam] = await db.update(examsTable).set({ status: "published", updatedAt: new Date() }).where(and(eq(examsTable.id, examId), eq(examsTable.instructorClerkId, clerkId))).returning();
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    const accessCodes = [];
    for (const email of studentEmails) {
      // Generate a unique 8-char code, retry if collision
      let code: string;
      let attempts = 0;
      while (true) {
        code = Math.random().toString(36).substring(2, 10).toUpperCase();
        const existing = await db.select({ id: examSessionsTable.id }).from(examSessionsTable).where(eq(examSessionsTable.accessCode, code));
        if (existing.length === 0 || attempts > 5) break;
        attempts++;
      }
      // Pre-allocate a session row (studentClerkId null until student claims it)
      await db.insert(examSessionsTable).values({
        examId,
        studentClerkId: null,
        studentEmail: email,
        accessCode: code!,
        status: "pending",
      });
      accessCodes.push({ code: code!, studentEmail: email });
    }

    res.json({
      exam: formatExam(exam),
      accessCodes,
    });
  } catch (err) {
    req.log.error({ err }, "publishExam error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/exams/:examId/results
router.get("/:examId/results", requireAuth, async (req: any, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
    if (!exam) return res.status(404).json({ error: "Exam not found" });

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
    if (exam.instructorClerkId !== clerkId) return res.status(403).json({ error: "Forbidden" });

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

export default router;
