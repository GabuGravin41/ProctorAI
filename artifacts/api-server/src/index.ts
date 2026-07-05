import app from "./app";

// Vercel serverless: export the Express app as the default handler.
// Vercel calls app(req, res) directly — no listen() needed.
export default app;

// Local development only — never bind a port in Vercel or production
if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
  const port = Number(process.env.PORT || 5000);
  // Use require so this synchronous log works even without top-level await
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  app.listen(port, () => {
    console.log(`[server] Listening on port ${port}`);
  });
}
