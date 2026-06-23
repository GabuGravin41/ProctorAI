import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
};

// GET /api/users/me
router.get("/me", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user) {
      const auth = getAuth(req);
      [user] = await db
        .insert(usersTable)
        .values({ clerkId, email: auth?.sessionClaims?.email as string ?? "", role: "student" })
        .returning();
    }
    res.json({
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "getMe error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/users/me
router.patch("/me", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const { name, role } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;

    let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user) {
      const auth = getAuth(req);
      [user] = await db
        .insert(usersTable)
        .values({ clerkId, email: auth?.sessionClaims?.email as string ?? "", role: role ?? "student", name })
        .returning();
    } else {
      [user] = await db.update(usersTable).set(updates).where(eq(usersTable.clerkId, clerkId)).returning();
    }
    res.json({
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "updateMe error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
