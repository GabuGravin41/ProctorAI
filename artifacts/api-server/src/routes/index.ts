import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import examsRouter from "./exams";
import questionsRouter from "./questions";
import sessionsRouter from "./sessions";
import flagsRouter from "./flags";
import dashboardRouter from "./dashboard";
import waitlistRouter from "./waitlist";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/exams", examsRouter);
router.use("/exams", questionsRouter);
router.use("/sessions", sessionsRouter);
router.use(flagsRouter);
router.use("/dashboard", dashboardRouter);
router.use(waitlistRouter);

export default router;
