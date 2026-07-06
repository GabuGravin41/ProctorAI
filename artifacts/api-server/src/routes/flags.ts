import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, cheatingFlagsTable, examSessionsTable } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { normalizeFlagType, shouldThrottleFlag, FLAG_COOLDOWN_MS } from "../lib/proctoring";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const loadTestSecret = req.headers["x-load-test-secret"];
  const configSecret = process.env.LOAD_TEST_SECRET;

  if (configSecret && loadTestSecret === configSecret) {
    req.clerkUserId = req.headers["x-mock-user-id"] || "load_test_user_default";
    return next();
  }

  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
};

function formatFlag(f: any) {
  return {
    id: f.id,
    sessionId: f.sessionId,
    type: f.type,
    description: f.description ?? null,
    clipData: f.clipData ?? null,
    detectedAt: f.detectedAt instanceof Date ? f.detectedAt.toISOString() : f.detectedAt,
    reviewStatus: f.reviewStatus,
    reviewedAt: f.reviewedAt?.toISOString() ?? null,
    reviewNote: f.reviewNote ?? null,
  };
}

// GET /api/sessions/:sessionId/flags
router.get("/sessions/:sessionId/flags", requireAuth, async (req: any, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const flags = await db.select().from(cheatingFlagsTable).where(eq(cheatingFlagsTable.sessionId, sessionId));
    res.json(flags.map(formatFlag));
  } catch (err) {
    req.log.error({ err }, "listSessionFlags error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/sessions/:sessionId/flags
router.post("/sessions/:sessionId/flags", requireAuth, async (req: any, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { type, description, clipData, detectedAt } = req.body;

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({ error: "Invalid session id" });
    }

    const normalizedType = normalizeFlagType(type);
    if (!normalizedType) {
      return res.status(400).json({ error: "Unsupported flag type" });
    }

    const [session] = await db.select().from(examSessionsTable).where(eq(examSessionsTable.id, sessionId));
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const [latestFlag] = await db
      .select({ detectedAt: cheatingFlagsTable.detectedAt })
      .from(cheatingFlagsTable)
      .where(and(eq(cheatingFlagsTable.sessionId, sessionId), eq(cheatingFlagsTable.type, normalizedType)))
      .orderBy(desc(cheatingFlagsTable.detectedAt))
      .limit(1);

    const now = detectedAt ? new Date(detectedAt) : new Date();
    if (shouldThrottleFlag(latestFlag?.detectedAt, now)) {
      return res.status(429).json({ error: "Flag suppressed due to cooldown", retryAfterSeconds: Math.ceil(FLAG_COOLDOWN_MS / 1000) });
    }

    const [flag] = await db
      .insert(cheatingFlagsTable)
      .values({
        sessionId,
        type: normalizedType,
        description: description ?? null,
        clipData: clipData ?? null,
        detectedAt: now,
        reviewStatus: "pending",
      })
      .returning();

    res.status(201).json(formatFlag(flag));
  } catch (err) {
    req.log.error({ err }, "reportFlag error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/flags/:flagId/review
router.patch("/flags/:flagId/review", requireAuth, async (req: any, res) => {
  try {
    const flagId = parseInt(req.params.flagId);
    const { reviewStatus, reviewNote } = req.body;

    const [flag] = await db
      .update(cheatingFlagsTable)
      .set({ reviewStatus, reviewNote: reviewNote ?? null, reviewedAt: new Date() })
      .where(eq(cheatingFlagsTable.id, flagId))
      .returning();

    if (!flag) return res.status(404).json({ error: "Flag not found" });
    res.json(formatFlag(flag));
  } catch (err) {
    req.log.error({ err }, "reviewFlag error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
