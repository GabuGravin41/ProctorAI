import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { examSessionsTable } from "./sessions";

export const cheatingFlagsTable = pgTable("cheating_flags", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => examSessionsTable.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: ["face_not_visible", "multiple_faces", "looking_away", "phone_detected", "suspicious_movement", "audio_anomaly"],
  }).notNull(),
  description: text("description"),
  clipData: text("clip_data"),
  detectedAt: timestamp("detected_at").notNull(),
  reviewStatus: text("review_status", { enum: ["pending", "dismissed", "confirmed"] }).notNull().default("pending"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFlagSchema = createInsertSchema(cheatingFlagsTable).omit({ id: true, createdAt: true });
export type InsertFlag = z.infer<typeof insertFlagSchema>;
export type CheatingFlag = typeof cheatingFlagsTable.$inferSelect;
