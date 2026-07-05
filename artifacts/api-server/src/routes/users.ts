import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "../db";
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
      let emailAddress = "";
      let fullName: string | null = null;
      try {
        const { clerkClient } = await import("@clerk/express");
        const clerkUser = await clerkClient.users.getUser(clerkId);
        emailAddress = (clerkUser.emailAddresses[0]?.emailAddress || "").toLowerCase();
        if (clerkUser.firstName || clerkUser.lastName) {
          fullName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();
        }
      } catch (clerkErr) {
        console.error("Clerk fetch user failed, fallback to empty:", clerkErr);
      }
      
      [user] = await db
        .insert(usersTable)
        .values({ 
          clerkId, 
          email: emailAddress,
          role: null,
          name: fullName
        })
        .returning();
    }

    res.json({
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name ?? null,
      role: user.role ?? null,
      institutionName: user.institutionName ?? null,
      subjectArea: user.subjectArea ?? null,
      trafficSource: user.trafficSource ?? null,
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
    const { name, role, institutionName, subjectArea, trafficSource } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (institutionName !== undefined) updates.institutionName = institutionName;
    if (subjectArea !== undefined) updates.subjectArea = subjectArea;
    if (trafficSource !== undefined) updates.trafficSource = trafficSource;

    let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user) {
      const auth = getAuth(req);
      [user] = await db
        .insert(usersTable)
        .values({ 
          clerkId, 
          email: auth?.sessionClaims?.email as string ?? "", 
          role: role ?? null, 
          name: name ?? null,
          institutionName: institutionName ?? null,
          subjectArea: subjectArea ?? null,
          trafficSource: trafficSource ?? null
        })
        .returning();
    } else {
      [user] = await db.update(usersTable).set(updates).where(eq(usersTable.clerkId, clerkId)).returning();
    }
    res.json({
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name ?? null,
      role: user.role ?? null,
      institutionName: user.institutionName ?? null,
      subjectArea: user.subjectArea ?? null,
      trafficSource: user.trafficSource ?? null,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "updateMe error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
