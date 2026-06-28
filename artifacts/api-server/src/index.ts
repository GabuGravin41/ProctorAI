import app from "./app";
import { logger } from "./lib/logger";

// Vercel serverless function export
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  const rawPort = process.env["PORT"] || 5000;
  const port = Number(rawPort);

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}
