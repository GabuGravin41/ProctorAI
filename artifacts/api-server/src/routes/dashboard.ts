import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, examsTable, examSessionsTable, cheatingFlagsTable } from "../db";
import { eq, count, sql } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
};

// GET /api/dashboard/stats
router.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;

    const exams = await db.select().from(examsTable).where(eq(examsTable.instructorClerkId, clerkId));
    const examIds = exams.map((e) => e.id);

    const publishedExams = exams.filter((e) => e.status === "published").length;

    let totalSessions = 0;
    let activeSessions = 0;
    let pendingFlags = 0;
    let totalScore = 0;
    let submittedCount = 0;

    const allSessions = [];
    for (const examId of examIds) {
      const sessions = await db.select().from(examSessionsTable).where(eq(examSessionsTable.examId, examId));
      allSessions.push(...sessions);
      totalSessions += sessions.length;
      activeSessions += sessions.filter((s) => s.status === "active").length;
      for (const s of sessions) {
        if (s.status === "submitted" && s.score !== null) {
          totalScore += s.score;
          submittedCount++;
        }
      }
    }

    const sessionIds = allSessions.map((s) => s.id);
    for (const sessionId of sessionIds) {
      const flags = await db.select().from(cheatingFlagsTable).where(eq(cheatingFlagsTable.sessionId, sessionId));
      pendingFlags += flags.filter((f) => f.reviewStatus === "pending").length;
    }

    // Recent exams (last 5)
    const recentExams = exams
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description ?? null,
        status: e.status,
        durationMinutes: e.durationMinutes,
        subject: e.subject ?? null,
        instructorClerkId: e.instructorClerkId,
        questionCount: 0,
        sessionCount: 0,
        flagCount: 0,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      }));

    // Recent flags (last 5 pending)
    const recentFlagsList = [];
    for (const sessionId of sessionIds.slice(0, 10)) {
      const flags = await db.select().from(cheatingFlagsTable).where(eq(cheatingFlagsTable.sessionId, sessionId));
      const pending = flags.filter((f) => f.reviewStatus === "pending");
      recentFlagsList.push(
        ...pending.map((f) => ({
          id: f.id,
          sessionId: f.sessionId,
          type: f.type,
          description: f.description ?? null,
          clipData: f.clipData ?? null,
          detectedAt: f.detectedAt instanceof Date ? f.detectedAt.toISOString() : f.detectedAt,
          reviewStatus: f.reviewStatus,
          reviewedAt: f.reviewedAt?.toISOString() ?? null,
          reviewNote: f.reviewNote ?? null,
        }))
      );
      if (recentFlagsList.length >= 5) break;
    }

    res.json({
      totalExams: exams.length,
      publishedExams,
      totalSessions,
      activeSessions,
      pendingFlags,
      avgScore: submittedCount > 0 ? totalScore / submittedCount : 0,
      recentExams,
      recentFlags: recentFlagsList.slice(0, 5),
    });
  } catch (err) {
    req.log.error({ err }, "getDashboardStats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
