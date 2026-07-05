import { Router } from "express";
import { db, waitlistTable } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

// Simple in-memory waitlist table check — create table if not exists
async function ensureWaitlistTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        role TEXT DEFAULT 'instructor',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch {
    // Table might already exist
  }
}

ensureWaitlistTable().catch(() => {});

// POST /api/waitlist
router.post("/waitlist", async (req: any, res) => {
  try {
    const { email, name, role } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    await db.execute(
      sql`INSERT INTO waitlist (email, name, role) VALUES (${email}, ${name ?? null}, ${role ?? "instructor"}) ON CONFLICT (email) DO NOTHING`
    );

    res.json({ success: true, message: "You're on the waitlist! We'll be in touch soon." });
  } catch (err) {
    req.log.error({ err }, "waitlist error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/waitlist (admin use — no auth for simplicity now)
router.get("/waitlist/count", async (req: any, res) => {
  try {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM waitlist`);
    const count = (result.rows?.[0] as any)?.count ?? 0;
    res.json({ count: Number(count) });
  } catch {
    res.json({ count: 0 });
  }
});

export default router;
