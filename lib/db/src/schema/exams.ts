import { pgTable, serial, text, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface AIConfig {
  provider: "free" | "custom_openrouter" | "custom_gemini";
  model: string;
  customApiKey?: string;
}

export const examsTable = pgTable("exams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  subject: text("subject"),
  status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  examType: text("exam_type", { enum: ["mixed", "proof_only"] }).notNull().default("mixed"),
  gradingMode: text("grading_mode", { enum: ["manual", "review_release", "auto_release"] }).notNull().default("review_release"),
  aiConfig: json("ai_config").$type<AIConfig>().default({ provider: "free", model: "deepseek/deepseek-chat" }).notNull(),
  instructorClerkId: text("instructor_clerk_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertExamSchema = createInsertSchema(examsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExam = z.infer<typeof insertExamSchema>;
export type Exam = typeof examsTable.$inferSelect;

