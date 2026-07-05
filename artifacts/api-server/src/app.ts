import express, { type Express } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";

const app: Express = express();

// ── req.log fallback ─────────────────────────────────────────────────────────
// Set this FIRST so every route handler has req.log available, even without pino.
// pino-http (when available) will override this with a proper logger instance.
app.use((req: any, _res: any, next: any) => {
  req.log = {
    info:  (...a: any[]) => console.log("[INFO]",  ...a),
    warn:  (...a: any[]) => console.warn("[WARN]",  ...a),
    error: (...a: any[]) => console.error("[ERROR]", ...a),
    debug: (...a: any[]) => console.debug("[DEBUG]", ...a),
  };
  next();
});

// ── pino-http logging (optional) ──────────────────────────────────────────────
// pino/pino-http are externalized in the Vercel bundle and may not be available
// at runtime.  Synchronous require() works here because the esbuild banner
// already places globalThis.require = createRequire(import.meta.url).
// If require throws we simply fall back to the console req.log above.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pinoHttpMod = require("pino-http");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pinoMod = require("pino");
  const logger = pinoMod({ level: "info" });
  app.use(pinoHttpMod({ logger }));
} catch {
  // pino not available — console fallback above is already registered
}

// ── Core middleware ───────────────────────────────────────────────────────────
app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Clerk authentication (reads CLERK_SECRET_KEY from env)
app.use(clerkMiddleware());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api", router);

export default app;
