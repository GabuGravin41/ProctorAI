import { Router } from "express";
import { getAuth } from "@clerk/express";
import {
  db,
  examInvitesTable,
  examsTable,
  studentRosterTable,
  examSessionsTable,
  questionsTable,
  usersTable
} from "../db";
import { eq, and, inArray } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
};

/**
 * POST /api/invites/cohort
 * Instructor invites an entire cohort (or multiple cohorts) to an exam.
 * Body: { examId: number, cohortIds: number[] }
 */
router.post("/cohort", requireAuth, async (req: any, res) => {
  try {
    const instructorClerkId = req.clerkUserId;
    const { examId, cohortIds } = req.body;

    if (!examId || !Array.isArray(cohortIds) || cohortIds.length === 0) {
      return res.status(400).json({ error: "examId and cohortIds array are required" });
    }

    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    // Verify ownership or write access
    const isOwner = exam.instructorClerkId === instructorClerkId;
    const isCollaborator = (exam.collaborators || []).some(
      (c) => c.clerkId === instructorClerkId && c.accessLevel === "write"
    );
    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: "Forbidden: You do not have permission to invite students to this exam" });
    }

    // Get all approved students in the requested cohorts
    const rosterEntries = await db
      .select()
      .from(studentRosterTable)
      .where(
        and(
          eq(studentRosterTable.instructorClerkId, instructorClerkId),
          inArray(studentRosterTable.cohortId, cohortIds),
          eq(studentRosterTable.status, "approved")
        )
      );

    if (rosterEntries.length === 0) {
      return res.status(400).json({ error: "No approved students found in the selected cohorts" });
    }

    // Filter out students who already have an invite or session for this exam
    const existingInvites = await db
      .select({ studentClerkId: examInvitesTable.studentClerkId })
      .from(examInvitesTable)
      .where(eq(examInvitesTable.examId, examId));

    const existingStudentIds = new Set(existingInvites.map((i) => i.studentClerkId));

    const newInvites = rosterEntries
      .filter((r) => !existingStudentIds.has(r.studentClerkId))
      .map((r) => ({
        examId,
        studentClerkId: r.studentClerkId,
        sentByClerkId: instructorClerkId,
        status: "pending",
      }));

    if (newInvites.length > 0) {
      await db.insert(examInvitesTable).values(newInvites);
    }

    res.status(201).json({
      message: `Invited ${newInvites.length} new student(s) to the exam`,
      invitedCount: newInvites.length,
      skippedCount: rosterEntries.length - newInvites.length,
    });
  } catch (err) {
    req.log.error({ err }, "inviteCohort error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/invites/student
 * Student: list all pending exam invites.
 */
router.get("/student", requireAuth, async (req: any, res) => {
  try {
    const studentClerkId = req.clerkUserId;
    const invites = await db
      .select()
      .from(examInvitesTable)
      .where(
        and(
          eq(examInvitesTable.studentClerkId, studentClerkId),
          eq(examInvitesTable.status, "pending")
        )
      );

    const result = await Promise.all(
      invites.map(async (invite) => {
        const [exam] = await db
          .select({
            id: examsTable.id,
            title: examsTable.title,
            subject: examsTable.subject,
            durationMinutes: examsTable.durationMinutes,
            description: examsTable.description,
            accessCode: examsTable.accessCode,
          })
          .from(examsTable)
          .where(eq(examsTable.id, invite.examId));

        const [sender] = await db
          .select({ name: usersTable.name, email: usersTable.email })
          .from(usersTable)
          .where(eq(usersTable.clerkId, invite.sentByClerkId));

        return {
          id: invite.id,
          examId: invite.examId,
          examTitle: exam?.title ?? "Exam",
          examSubject: exam?.subject ?? null,
          examDurationMinutes: exam?.durationMinutes ?? 60,
          examDescription: exam?.description ?? null,
          senderName: sender?.name ?? "Instructor",
          createdAt: invite.createdAt.toISOString(),
        };
      })
    );

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "listStudentInvites error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/invites/:inviteId/accept
 * Student accepts an invite -> creates or retrieves exam session, updates invite status, returns session details.
 */
router.post("/:inviteId/accept", requireAuth, async (req: any, res) => {
  try {
    const studentClerkId = req.clerkUserId;
    const inviteId = parseInt(req.params.inviteId);

    const [invite] = await db
      .select()
      .from(examInvitesTable)
      .where(
        and(
          eq(examInvitesTable.id, inviteId),
          eq(examInvitesTable.studentClerkId, studentClerkId)
        )
      );

    if (!invite) return res.status(404).json({ error: "Invite not found" });

    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, invite.examId));
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    // Find or create student's session for this exam
    let [session] = await db
      .select()
      .from(examSessionsTable)
      .where(
        and(
          eq(examSessionsTable.examId, exam.id),
          eq(examSessionsTable.studentClerkId, studentClerkId)
        )
      );

    if (!session) {
      const [student] = await db.select().from(usersTable).where(eq(usersTable.clerkId, studentClerkId));
      [session] = await db
        .insert(examSessionsTable)
        .values({
          examId: exam.id,
          studentClerkId,
          studentEmail: student?.email ?? "",
          studentName: student?.name ?? "Student",
          accessCode: exam.accessCode ?? "INVITE",
          status: "pending",
        })
        .returning();
    }

    // Mark invite as accepted
    await db
      .update(examInvitesTable)
      .set({ status: "accepted", sessionId: session.id, updatedAt: new Date() })
      .where(eq(examInvitesTable.id, inviteId));

    res.json({
      sessionId: session.id,
      examId: exam.id,
      accessCode: session.accessCode,
    });
  } catch (err) {
    req.log.error({ err }, "acceptInvite error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/invites/:inviteId/decline
 * Student declines an invite.
 */
router.post("/:inviteId/decline", requireAuth, async (req: any, res) => {
  try {
    const studentClerkId = req.clerkUserId;
    const inviteId = parseInt(req.params.inviteId);

    await db
      .update(examInvitesTable)
      .set({ status: "declined", updatedAt: new Date() })
      .where(
        and(
          eq(examInvitesTable.id, inviteId),
          eq(examInvitesTable.studentClerkId, studentClerkId)
        )
      );

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "declineInvite error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
