import app from "./app";

// Vercel serverless: export app as the default handler.
// Vercel calls this as a request handler directly — no listen() needed.
export default app;

// Local development only — never bind a port in Vercel serverless
const isVercel = !!process.env.VERCEL;
const isProduction = process.env.NODE_ENV === 'production';

if (!isVercel && !isProduction) {
  const { logger } = await import("./lib/logger");
  const rawPort = process.env["PORT"] || 5000;
  const port = Number(rawPort);

  app.listen(port, (err?: Error) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}
