import express, { type Express } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes";

const app: Express = express();

// Pino HTTP logging — optional, gracefully skipped on Vercel serverless
// where pino-http / pino are not bundled to keep the lambda lean.
// Routes use req.log.error() / req.log.info() — the console fallback below
// keeps that working without pino.
try {
  const { createRequire } = await import("node:module");
  const _require = createRequire(import.meta.url);
  const pinoHttp = _require("pino-http") as any;
  const { logger } = await import("./lib/logger");
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req: any) {
          return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
        },
        res(res: any) {
          return { statusCode: res.statusCode };
        },
      },
    }),
  );
} catch {
  // pino-http not available — add a console-based req.log so routes don't crash
  app.use((_req: any, _res: any, next: any) => {
    _req.log = {
      info: (...args: any[]) => console.log("[INFO]", ...args),
      warn: (...args: any[]) => console.warn("[WARN]", ...args),
      error: (...args: any[]) => console.error("[ERROR]", ...args),
      debug: (...args: any[]) => console.debug("[DEBUG]", ...args),
    };
    next();
  });
}

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Clerk authentication middleware
app.use(clerkMiddleware());

app.use("/api", router);

export default app;
