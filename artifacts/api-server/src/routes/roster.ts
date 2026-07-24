import { Router } from "express";
import { getAuth } from "@clerk/express";
import {
  db,
  instructorProfilesTable,
  studentCohortsTable,
  studentRosterTable,
  usersTable,
} from "../db";
import { eq, and } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
};

/** Generate a unique instructor code like "COACH-AB3K7" */
function generateInstructorCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "COACH-";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── Instructor Profile ───────────────────────────────────────────────────────

/**
 * GET /api/roster/profile
 * Returns the instructor's profile (creates one if it doesn't exist).
 */
router.get("/profile", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    let [profile] = await db
      .select()
      .from(instructorProfilesTable)
      .where(eq(instructorProfilesTable.clerkId, clerkId));

    if (!profile) {
      // Get display name from users table
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.clerkId, clerkId));

      // Generate unique code
      let code: string = "";
      let attempts = 0;
      while (attempts < 20) {
        code = generateInstructorCode();
        const [existing] = await db
          .select()
          .from(instructorProfilesTable)
          .where(eq(instructorProfilesTable.instructorCode, code));
        if (!existing) break;
        attempts++;
      }

      [profile] = await db
        .insert(instructorProfilesTable)
        .values({
          clerkId,
          instructorCode: code,
          displayName: user?.name ?? "Instructor",
        })
        .returning();
    }

    res.json(profile);
  } catch (err) {
    req.log.error({ err }, "getInstructorProfile error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/roster/profile/regenerate-code
 * Regenerates the instructor's code (old code stops working immediately).
 */
router.post("/profile/regenerate-code", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    let code: string = "";
    let attempts = 0;
    while (attempts < 20) {
      code = generateInstructorCode();
      const [existing] = await db
        .select()
        .from(instructorProfilesTable)
        .where(eq(instructorProfilesTable.instructorCode, code));
      if (!existing) break;
      attempts++;
    }
    const [profile] = await db
      .update(instructorProfilesTable)
      .set({ instructorCode: code })
      .where(eq(instructorProfilesTable.clerkId, clerkId))
      .returning();

    if (!profile) return res.status(404).json({ error: "Profile not found" });
    res.json(profile);
  } catch (err) {
    req.log.error({ err }, "regenerateCode error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Cohorts ──────────────────────────────────────────────────────────────────

/**
 * GET /api/roster/cohorts
 * List all cohorts owned by this instructor.
 */
router.get("/cohorts", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const cohorts = await db
      .select()
      .from(studentCohortsTable)
      .where(eq(studentCohortsTable.instructorClerkId, clerkId));
    res.json(cohorts);
  } catch (err) {
    req.log.error({ err }, "listCohorts error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/roster/cohorts
 * Create a new cohort.
 */
router.post("/cohorts", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const { name, description, subject, year } = req.body;
    if (!name) return res.status(400).json({ error: "Cohort name is required" });

    const [cohort] = await db
      .insert(studentCohortsTable)
      .values({ instructorClerkId: clerkId, name, description, subject, year })
      .returning();
    res.status(201).json(cohort);
  } catch (err) {
    req.log.error({ err }, "createCohort error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/roster/cohorts/:cohortId
 * Update cohort metadata.
 */
router.patch("/cohorts/:cohortId", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const cohortId = parseInt(req.params.cohortId);
    const { name, description, subject, year } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (subject !== undefined) updates.subject = subject;
    if (year !== undefined) updates.year = year;

    const [cohort] = await db
      .update(studentCohortsTable)
      .set(updates)
      .where(
        and(
          eq(studentCohortsTable.id, cohortId),
          eq(studentCohortsTable.instructorClerkId, clerkId)
        )
      )
      .returning();

    if (!cohort) return res.status(404).json({ error: "Cohort not found" });
    res.json(cohort);
  } catch (err) {
    req.log.error({ err }, "updateCohort error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/roster/cohorts/:cohortId
 * Delete a cohort (students are ungrouped, not removed from roster).
 */
router.delete("/cohorts/:cohortId", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const cohortId = parseInt(req.params.cohortId);

    await db
      .delete(studentCohortsTable)
      .where(
        and(
          eq(studentCohortsTable.id, cohortId),
          eq(studentCohortsTable.instructorClerkId, clerkId)
        )
      );

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "deleteCohort error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Student Roster ───────────────────────────────────────────────────────────

/**
 * GET /api/roster/students
 * List all students in this instructor's roster (with optional status filter).
 */
router.get("/students", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const { status } = req.query;

    let students = await db
      .select()
      .from(studentRosterTable)
      .where(eq(studentRosterTable.instructorClerkId, clerkId));

    if (status) {
      students = students.filter((s) => s.status === status);
    }

    res.json(students);
  } catch (err) {
    req.log.error({ err }, "listStudents error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/roster/join
 * Student enters instructor code to request joining a roster.
 * Body: { instructorCode: string }
 */
router.post("/join", requireAuth, async (req: any, res) => {
  try {
    const studentClerkId = req.clerkUserId;
    const { instructorCode } = req.body;
    if (!instructorCode) {
      return res.status(400).json({ error: "Instructor code is required" });
    }

    const normalizedCode = instructorCode.trim().toUpperCase();

    // Find instructor by code
    const [profile] = await db
      .select()
      .from(instructorProfilesTable)
      .where(eq(instructorProfilesTable.instructorCode, normalizedCode));

    if (!profile) {
      return res.status(404).json({ error: "Invalid instructor code. Please check with your instructor." });
    }

    // Don't allow instructor to join their own roster
    if (profile.clerkId === studentClerkId) {
      return res.status(400).json({ error: "You cannot join your own roster." });
    }

    // Check if already in this instructor's roster
    const [existing] = await db
      .select()
      .from(studentRosterTable)
      .where(
        and(
          eq(studentRosterTable.instructorClerkId, profile.clerkId),
          eq(studentRosterTable.studentClerkId, studentClerkId)
        )
      );

    if (existing) {
      return res.status(409).json({
        error: existing.status === "pending"
          ? "You have already sent a join request to this instructor. Please wait for approval."
          : "You are already in this instructor's roster.",
        status: existing.status,
      });
    }

    // Get student info
    const [student] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, studentClerkId));

    // Create join request
    const [entry] = await db
      .insert(studentRosterTable)
      .values({
        instructorClerkId: profile.clerkId,
        studentClerkId,
        studentName: student?.name ?? "Student",
        studentEmail: student?.email ?? "",
        status: "pending",
      })
      .returning();

    res.status(201).json({
      message: "Join request sent successfully. Your instructor will approve your request.",
      instructorDisplayName: profile.displayName,
      entry,
    });
  } catch (err) {
    req.log.error({ err }, "joinRoster error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/roster/students/:entryId
 * Instructor approves/declines a student, and optionally assigns to cohort.
 * Body: { status: 'approved' | 'declined', cohortId?: number }
 */
router.patch("/students/:entryId", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const entryId = parseInt(req.params.entryId);
    const { status, cohortId } = req.body;

    if (!["approved", "declined"].includes(status)) {
      return res.status(400).json({ error: "status must be 'approved' or 'declined'" });
    }

    const updates: any = { status };
    if (cohortId !== undefined) updates.cohortId = cohortId;

    const [entry] = await db
      .update(studentRosterTable)
      .set(updates)
      .where(
        and(
          eq(studentRosterTable.id, entryId),
          eq(studentRosterTable.instructorClerkId, clerkId)
        )
      )
      .returning();

    if (!entry) return res.status(404).json({ error: "Roster entry not found" });
    res.json(entry);
  } catch (err) {
    req.log.error({ err }, "updateRosterEntry error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/roster/students/:entryId
 * Remove a student from the roster.
 */
router.delete("/students/:entryId", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.clerkUserId;
    const entryId = parseInt(req.params.entryId);

    await db
      .delete(studentRosterTable)
      .where(
        and(
          eq(studentRosterTable.id, entryId),
          eq(studentRosterTable.instructorClerkId, clerkId)
        )
      );

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "removeRosterEntry error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/roster/my-instructors
 * Student: list all instructors they are enrolled with.
 */
router.get("/my-instructors", requireAuth, async (req: any, res) => {
  try {
    const studentClerkId = req.clerkUserId;
    const entries = await db
      .select()
      .from(studentRosterTable)
      .where(eq(studentRosterTable.studentClerkId, studentClerkId));

    // Fetch instructor profiles for each entry
    const result = await Promise.all(
      entries.map(async (entry) => {
        const [profile] = await db
          .select()
          .from(instructorProfilesTable)
          .where(eq(instructorProfilesTable.clerkId, entry.instructorClerkId));
        const [cohort] = entry.cohortId
          ? await db
              .select()
              .from(studentCohortsTable)
              .where(eq(studentCohortsTable.id, entry.cohortId))
          : [null];
        return {
          ...entry,
          instructorDisplayName: profile?.displayName ?? "Instructor",
          cohortName: cohort?.name ?? null,
        };
      })
    );

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "myInstructors error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/roster/resolve-code/:code
 * Resolve an instructor code to display instructor info before joining.
 */
router.get("/resolve-code/:code", requireAuth, async (req: any, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const [profile] = await db
      .select()
      .from(instructorProfilesTable)
      .where(eq(instructorProfilesTable.instructorCode, code));

    if (!profile) {
      return res.status(404).json({ error: "Invalid instructor code." });
    }

    const [user] = await db
      .select({ name: usersTable.name, institutionName: usersTable.institutionName, subjectArea: usersTable.subjectArea })
      .from(usersTable)
      .where(eq(usersTable.clerkId, profile.clerkId));

    res.json({
      instructorCode: profile.instructorCode,
      displayName: profile.displayName ?? user?.name ?? "Instructor",
      institutionName: user?.institutionName ?? null,
      subjectArea: user?.subjectArea ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "resolveCode error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
