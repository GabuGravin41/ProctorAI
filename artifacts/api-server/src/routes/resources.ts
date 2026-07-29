import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, resourcesTable, usersTable, studentRosterTable } from "../db";
import { eq, and, isNull, or, inArray } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
};

// GET /api/resources
router.get("/resources", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.role === "instructor") {
      // Instructors see all resources in the system
      const allResources = await db.select().from(resourcesTable);
      return res.json(allResources);
    } else {
      // Students see resources that are:
      // 1. Visible to anyone (cohortId is null)
      // 2. OR restricted to a cohort they are approved in
      const rosterEntries = await db
        .select()
        .from(studentRosterTable)
        .where(
          and(
            eq(studentRosterTable.studentClerkId, clerkId),
            eq(studentRosterTable.status, "approved")
          )
        );

      const approvedCohortIds = rosterEntries
        .map((r) => r.cohortId)
        .filter((cid): cid is number => cid !== null);

      let studentResources;
      if (approvedCohortIds.length > 0) {
        studentResources = await db
          .select()
          .from(resourcesTable)
          .where(
            or(
              isNull(resourcesTable.cohortId),
              inArray(resourcesTable.cohortId, approvedCohortIds)
            )
          );
      } else {
        studentResources = await db
          .select()
          .from(resourcesTable)
          .where(isNull(resourcesTable.cohortId));
      }

      return res.json(studentResources);
    }
  } catch (err) {
    req.log.error({ err }, "getResources error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/resources
router.post("/resources", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role !== "instructor") return res.status(403).json({ error: "Only instructors can add resources" });

    const { title, description, url, type, subject, cohortId } = req.body;
    if (!title || !url || !type || !subject) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [newResource] = await db
      .insert(resourcesTable)
      .values({
        title,
        description: description || null,
        url,
        type,
        subject,
        cohortId: cohortId ? Number(cohortId) : null,
        ownerClerkId: clerkId,
      })
      .returning();

    res.status(201).json(newResource);
  } catch (err) {
    req.log.error({ err }, "createResource error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/resources/:resourceId
router.delete("/resources/:resourceId", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const resourceId = parseInt(req.params.resourceId);
    if (isNaN(resourceId)) return res.status(400).json({ error: "Invalid resource ID" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role !== "instructor") return res.status(403).json({ error: "Only instructors can delete resources" });

    const [resource] = await db.select().from(resourcesTable).where(eq(resourcesTable.id, resourceId));
    if (!resource) return res.status(404).json({ error: "Resource not found" });

    // Validate ownership or admin override
    const isAdmin = user.email.toLowerCase() === "daltonomondi04@gmail.com";
    if (resource.ownerClerkId !== clerkId && !isAdmin) {
      return res.status(403).json({ error: "You can only delete resources you created" });
    }

    await db.delete(resourcesTable).where(eq(resourcesTable.id, resourceId));
    res.json({ success: true, message: "Resource deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "deleteResource error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
