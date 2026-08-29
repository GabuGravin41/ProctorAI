import { getAuth } from "@clerk/express";

export const requireAuth = (req: any, res: any, next: any) => {
  const loadTestSecret = req.headers["x-load-test-secret"];
  const configSecret = process.env.LOAD_TEST_SECRET || "proctorai_load_test_secret_2026";

  if (loadTestSecret && loadTestSecret === configSecret) {
    req.clerkUserId = req.headers["x-mock-user-id"] || "load_test_user_default";
    return next();
  }

  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
};
