import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, cheatingFlagsTable, examSessionsTable, examsTable, usersTable } from "../db";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
};

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
      })
      .from(cheatingFlagsTable)
      .orderBy(desc(cheatingFlagsTable.detectedAt))
      .limit(100);

    const enriched = await Promise.all(events.map(async (event) => {
      const [session] = await db.select({
        id: examSessionsTable.id,
        studentName: examSessionsTable.studentName,
        studentEmail: examSessionsTable.studentEmail,
        accessCode: examSessionsTable.accessCode,
      }).from(examSessionsTable).where(eq(examSessionsTable.id, event.sessionId));

      const [exam] = await db.select({
        id: examsTable.id,
        title: examsTable.title,
      }).from(examsTable).where(eq(examsTable.id, session?.id ? undefined as never : undefined));

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

export default router;
