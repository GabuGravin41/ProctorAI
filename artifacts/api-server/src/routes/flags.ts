import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, cheatingFlagsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
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

    const [flag] = await db
      .insert(cheatingFlagsTable)
      .values({
        sessionId,
        type,
        description: description ?? null,
        clipData: clipData ?? null,
        detectedAt: new Date(detectedAt),
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
