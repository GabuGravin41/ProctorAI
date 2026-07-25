import { pgTable, text, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  clerkId: text('clerk_id').notNull().unique(),
  name: text('name'),
  email: text('email').notNull(),
  role: text('role'), // 'student' | 'instructor' — nullable until onboarding complete
  institutionName: text('institution_name'),
  subjectArea: text('subject_area'),
  trafficSource: text('traffic_source'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const examsTable = pgTable('exams', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  instructorClerkId: text('instructor_clerk_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  subject: text('subject'),
  durationMinutes: integer('duration_minutes').notNull(),
  status: text('status').notNull().default('draft'), // 'draft' | 'published' | 'archived'
  gradingMode: text('grading_mode').notNull(), // 'auto' | 'manual'
  aiConfig: jsonb('ai_config').$type<{
    provider: 'free' | 'custom_openrouter' | 'custom_gemini' | 'hosted';
    model: string;
    customApiKey?: string;
    proctoringEnabled?: boolean;
  }>(),
  examType: text('exam_type'), // 'mixed' | 'proof_only'
  accessCode: text('access_code').unique(),
  isPublic: boolean('is_public').notNull().default(false),
  topic: text('topic'),
  tags: jsonb('tags').$type<string[]>(),
  // Updated collaborators: now has access level per person
  collaborators: jsonb('collaborators').$type<{ clerkId: string; accessLevel: 'read' | 'write' }[]>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const questionsTable = pgTable('questions', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  examId: integer('exam_id').notNull().references(() => examsTable.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  type: text('type').notNull(), // 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'
  options: jsonb('options').$type<string[]>(),
  correctAnswer: text('correct_answer'),
  referenceSolution: text('reference_solution'),
  points: integer('points').notNull().default(1),
  difficulty: text('difficulty'), // 'easy' | 'medium' | 'hard'
  rubric: jsonb('rubric').$type<{ criterion: string; maxPoints: number; description: string }[]>(),
  order: integer('order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const examSessionsTable = pgTable('exam_sessions', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  examId: integer('exam_id').notNull().references(() => examsTable.id, { onDelete: 'cascade' }),
  studentClerkId: text('student_clerk_id').notNull(),
  studentEmail: text('student_email'),
  studentName: text('student_name'),
  accessCode: text('access_code').notNull(),
  status: text('status').notNull().default('not_started'), // 'not_started' | 'in_progress' | 'completed' | 'abandoned'
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  submittedAt: timestamp('submitted_at'),
  answers: jsonb('answers').$type<Record<number, string>>(),
  score: integer('score'),
  maxScore: integer('max_score'),
  isResultsReleased: boolean('is_results_released').notNull().default(false),
  reviewRequested: boolean('review_requested').notNull().default(false),
  coachFeedback: text('coach_feedback'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const cheatingFlagsTable = pgTable('cheating_flags', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  sessionId: integer('session_id').notNull().references(() => examSessionsTable.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'tab_switch' | 'copy_paste' | 'screenshot' | 'focus_loss'
  description: text('description'),
  clipData: text('clip_data'),
  detectedAt: timestamp('detected_at').notNull().defaultNow(),
  reviewStatus: text('review_status').notNull().default('pending'), // 'pending' | 'confirmed' | 'dismissed'
  reviewedAt: timestamp('reviewed_at'),
  reviewNote: text('review_note'),
  screenshotUrl: text('screenshot_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const waitlistTable = pgTable('waitlist', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  email: text('email').notNull().unique(),
  role: text('role'), // 'student' | 'instructor'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const answersTable = pgTable('answers', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  sessionId: integer('session_id').notNull().references(() => examSessionsTable.id, { onDelete: 'cascade' }),
  questionId: integer('question_id').notNull().references(() => questionsTable.id, { onDelete: 'cascade' }),
  answer: text('answer').notNull(),
  attachments: jsonb('attachments').$type<string[]>(),
  isCorrect: integer('is_correct').notNull().default(0), // 0 | 1
  points: integer('points').notNull().default(0),
  feedback: text('feedback'),
  ocrText: text('ocr_text'),
  aiScore: integer('ai_score'),
  aiFeedback: text('ai_feedback'),
  gradingRubricScores: jsonb('grading_rubric_scores'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── New Tables ───────────────────────────────────────────────────────────────

/**
 * Instructor profiles — stores the unique instructor code
 * that students type to join an instructor's roster.
 */
export const instructorProfilesTable = pgTable('instructor_profiles', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  clerkId: text('clerk_id').notNull().unique(),
  instructorCode: text('instructor_code').notNull().unique(), // e.g. "COACH-XY7K3"
  displayName: text('display_name'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Student cohorts / groups — instructors organize students into named groups.
 * e.g. "IOI Students 2025", "KMO Round 1 Group", "Physics Contest Cohort 2026"
 */
export const studentCohortsTable = pgTable('student_cohorts', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  instructorClerkId: text('instructor_clerk_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  subject: text('subject'),
  year: text('year'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Student roster entries — students who have joined an instructor's roster
 * (either pending approval or approved, and assigned to a cohort).
 */
export const studentRosterTable = pgTable('student_roster', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  instructorClerkId: text('instructor_clerk_id').notNull(),
  cohortId: integer('cohort_id').references(() => studentCohortsTable.id, { onDelete: 'set null' }),
  studentClerkId: text('student_clerk_id').notNull(),
  studentName: text('student_name'),
  studentEmail: text('student_email'),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'declined'
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

/**
 * In-platform exam invitations — instructor sends exam invites to students.
 * Student sees them on their homepage and can accept or decline.
 */
export const examInvitesTable = pgTable('exam_invites', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  examId: integer('exam_id').notNull().references(() => examsTable.id, { onDelete: 'cascade' }),
  studentClerkId: text('student_clerk_id').notNull(),
  sentByClerkId: text('sent_by_clerk_id').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'accepted' | 'declined'
  sessionId: integer('session_id').references(() => examSessionsTable.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
