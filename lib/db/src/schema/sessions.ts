import { pgTable, serial, text, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { examsTable } from "./exams";

export const examSessionsTable = pgTable("exam_sessions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull().references(() => examsTable.id, { onDelete: "cascade" }),
  studentClerkId: text("student_clerk_id"),
  studentEmail: text("student_email"),
  studentName: text("student_name"),
  accessCode: text("access_code").notNull().unique(),
  status: text("status", { enum: ["pending", "active", "submitted", "expired"] }).notNull().default("pending"),
  score: real("score"),
  maxScore: integer("max_score"),
  startedAt: timestamp("started_at"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const answersTable = pgTable("answers", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => examSessionsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull(),
  answer: text("answer").notNull(),
  isCorrect: integer("is_correct"),
  points: real("points").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSessionSchema = createInsertSchema(examSessionsTable).omit({ id: true, createdAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type ExamSession = typeof examSessionsTable.$inferSelect;

export const insertAnswerSchema = createInsertSchema(answersTable).omit({ id: true, createdAt: true });
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;
export type Answer = typeof answersTable.$inferSelect;
