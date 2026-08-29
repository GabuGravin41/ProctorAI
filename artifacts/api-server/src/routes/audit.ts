import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, cheatingFlagsTable, examSessionsTable, examsTable, usersTable } from "../db";
import { eq, desc, inArray } from "drizzle-orm";
import { formatAuditEventsCsv, formatExamAuditCsv } from "../lib/audit-export";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
};

// GET /api/audit/events — all flags across instructor's own exams (up to 100)
router.get("/audit/events", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user || user.role !== "instructor") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const events = await db
      .select({
        id: cheatingFlagsTable.id,
        sessionId: cheatingFlagsTable.sessionId,
        type: cheatingFlagsTable.type,
        description: cheatingFlagsTable.description,
        reviewStatus: cheatingFlagsTable.reviewStatus,
        detectedAt: cheatingFlagsTable.detectedAt,
        reviewNote: cheatingFlagsTable.reviewNote,
        reviewedAt: cheatingFlagsTable.reviewedAt,
        screenshotUrl: cheatingFlagsTable.screenshotUrl,
      })
      .from(cheatingFlagsTable)
      .orderBy(desc(cheatingFlagsTable.detectedAt))
      .limit(100);

    const enriched = await Promise.all(events.map(async (event) => {
      const [session] = await db.select({
        id: examSessionsTable.id,
        examId: examSessionsTable.examId,
        studentName: examSessionsTable.studentName,
        studentEmail: examSessionsTable.studentEmail,
        accessCode: examSessionsTable.accessCode,
      }).from(examSessionsTable).where(eq(examSessionsTable.id, event.sessionId));

      // Fixed: join on session.examId not session.id
      const [exam] = session?.examId
        ? await db.select({ id: examsTable.id, title: examsTable.title }).from(examsTable).where(eq(examsTable.id, session.examId))
        : [undefined];

      return {
        ...event,
        detectedAt: event.detectedAt?.toISOString() ?? null,
        reviewedAt: event.reviewedAt?.toISOString() ?? null,
        studentName: session?.studentName ?? null,
        studentEmail: session?.studentEmail ?? null,
        accessCode: session?.accessCode ?? null,
        examTitle: exam?.title ?? null,
      };
    }));

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "listAuditEvents error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/audit/events/export — CSV of all flags across instructor's exams
router.get("/audit/events/export", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user || user.role !== "instructor") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const events = await db
      .select({
        id: cheatingFlagsTable.id,
        sessionId: cheatingFlagsTable.sessionId,
        type: cheatingFlagsTable.type,
        description: cheatingFlagsTable.description,
        reviewStatus: cheatingFlagsTable.reviewStatus,
        reviewNote: cheatingFlagsTable.reviewNote,
        detectedAt: cheatingFlagsTable.detectedAt,
        reviewedAt: cheatingFlagsTable.reviewedAt,
        screenshotUrl: cheatingFlagsTable.screenshotUrl,
      })
      .from(cheatingFlagsTable)
      .orderBy(desc(cheatingFlagsTable.detectedAt))
      .limit(500);

    const enriched = await Promise.all(events.map(async (event) => {
      const [session] = await db.select({
        examId: examSessionsTable.examId,
        studentName: examSessionsTable.studentName,
        studentEmail: examSessionsTable.studentEmail,
        accessCode: examSessionsTable.accessCode,
      }).from(examSessionsTable).where(eq(examSessionsTable.id, event.sessionId));

      // Fixed: join on session.examId not event.sessionId (was a bug)
      const [exam] = session?.examId
        ? await db.select({ title: examsTable.title }).from(examsTable).where(eq(examsTable.id, session.examId))
        : [undefined];

      return {
        ...event,
        detectedAt: event.detectedAt?.toISOString() ?? null,
        reviewedAt: event.reviewedAt?.toISOString() ?? null,
        studentName: session?.studentName ?? null,
        studentEmail: session?.studentEmail ?? null,
        accessCode: session?.accessCode ?? null,
        examTitle: exam?.title ?? null,
      };
    }));

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=proctoring-audit.csv");
    res.send(formatAuditEventsCsv(enriched));
  } catch (err) {
    req.log.error({ err }, "exportAuditEvents error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/exams/:examId/audit — per-exam structured audit report (JSON)
router.get("/exams/:examId/audit", requireAuth, async (req: any, res) => {
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

    // Fetch all sessions for this exam
    const sessions = await db.select().from(examSessionsTable).where(eq(examSessionsTable.examId, examId));

    // Fetch all flags for all sessions in one batch
    const sessionIds = sessions.map(s => s.id);
    const allFlags = sessionIds.length > 0
      ? await db.select().from(cheatingFlagsTable).where(inArray(cheatingFlagsTable.sessionId, sessionIds))
      : [];

    const flagsBySession = new Map<number, typeof allFlags>();
    for (const flag of allFlags) {
      const existing = flagsBySession.get(flag.sessionId) ?? [];
      existing.push(flag);
      flagsBySession.set(flag.sessionId, existing);
    }

    const sessionSummaries = sessions.map(s => {
      const flags = flagsBySession.get(s.id) ?? [];
      return {
        sessionId: s.id,
        studentName: s.studentName ?? null,
        studentEmail: s.studentEmail ?? null,
        accessCode: s.accessCode,
        status: s.status,
        score: s.score ?? null,
        maxScore: s.maxScore ?? null,
        scorePct: s.score !== null && s.maxScore ? Math.round((s.score / s.maxScore) * 100) : null,
        flagCount: flags.length,
        pendingFlagCount: flags.filter(f => f.reviewStatus === "pending").length,
        confirmedFlagCount: flags.filter(f => f.reviewStatus === "confirmed").length,
        dismissedFlagCount: flags.filter(f => f.reviewStatus === "dismissed").length,
        startedAt: s.startedAt?.toISOString() ?? null,
        submittedAt: s.submittedAt?.toISOString() ?? null,
        flags: flags.map(f => ({
          id: f.id,
          type: f.type,
          description: f.description ?? null,
          detectedAt: f.detectedAt?.toISOString() ?? null,
          reviewStatus: f.reviewStatus,
          reviewNote: f.reviewNote ?? null,
          reviewedAt: f.reviewedAt?.toISOString() ?? null,
          screenshotUrl: f.screenshotUrl ?? null,
        })),
      };
    });

    res.json({
      exam: {
        id: exam.id,
        title: exam.title,
        subject: exam.subject ?? null,
        durationMinutes: exam.durationMinutes,
        status: exam.status,
        accessCode: exam.accessCode ?? null,
        createdAt: exam.createdAt.toISOString(),
      },
      generatedAt: new Date().toISOString(),
      totalSessions: sessions.length,
      totalFlags: allFlags.length,
      sessions: sessionSummaries,
    });
  } catch (err) {
    req.log.error({ err }, "getExamAudit error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/exams/:examId/audit/export — per-exam audit as CSV download
router.get("/exams/:examId/audit/export", requireAuth, async (req: any, res) => {
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
    const sessionIds = sessions.map(s => s.id);
    const allFlags = sessionIds.length > 0
      ? await db.select().from(cheatingFlagsTable).where(inArray(cheatingFlagsTable.sessionId, sessionIds))
      : [];

    const flagsBySession = new Map<number, typeof allFlags>();
    for (const flag of allFlags) {
      const existing = flagsBySession.get(flag.sessionId) ?? [];
      existing.push(flag);
      flagsBySession.set(flag.sessionId, existing);
    }

    const sessionData = sessions.map(s => ({
      studentName: s.studentName ?? null,
      studentEmail: s.studentEmail ?? null,
      accessCode: s.accessCode,
      status: s.status,
      score: s.score ?? null,
      maxScore: s.maxScore ?? null,
      submittedAt: s.submittedAt?.toISOString() ?? null,
      flags: (flagsBySession.get(s.id) ?? []).map(f => ({
        type: f.type,
        description: f.description ?? null,
        detectedAt: f.detectedAt?.toISOString() ?? null,
        reviewStatus: f.reviewStatus,
        reviewNote: f.reviewNote ?? null,
        screenshotUrl: f.screenshotUrl ?? null,
      })),
    }));

    const filename = `${exam.title.replace(/[^a-z0-9]/gi, "_")}_Audit_Report.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(formatExamAuditCsv(exam.title, sessionData));
  } catch (err) {
    req.log.error({ err }, "exportExamAudit error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
