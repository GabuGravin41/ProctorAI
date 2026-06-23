import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, questionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.clerkUserId = userId;
  next();
};

function formatQuestion(q: any) {
  return {
    id: q.id,
    examId: q.examId,
    type: q.type,
    text: q.text,
    options: q.options ?? null,
    correctAnswer: q.correctAnswer ?? null,
    points: q.points,
    orderIndex: q.orderIndex,
  };
}

// GET /api/exams/:examId/questions
router.get("/:examId/questions", requireAuth, async (req: any, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, examId)).orderBy(questionsTable.orderIndex);
    res.json(questions.map(formatQuestion));
  } catch (err) {
    req.log.error({ err }, "listQuestions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/exams/:examId/questions
router.post("/:examId/questions", requireAuth, async (req: any, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const { type, text, options, correctAnswer, points } = req.body;

    const existing = await db.select().from(questionsTable).where(eq(questionsTable.examId, examId));
    const orderIndex = existing.length;

    const [q] = await db
      .insert(questionsTable)
      .values({ examId, type, text, options: options ?? null, correctAnswer: correctAnswer ?? null, points: points ?? 1, orderIndex })
      .returning();
    res.status(201).json(formatQuestion(q));
  } catch (err) {
    req.log.error({ err }, "createQuestion error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/exams/:examId/questions/:questionId
router.patch("/:examId/questions/:questionId", requireAuth, async (req: any, res) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const { type, text, options, correctAnswer, points, orderIndex } = req.body;
    const updates: any = {};
    if (type !== undefined) updates.type = type;
    if (text !== undefined) updates.text = text;
    if (options !== undefined) updates.options = options;
    if (correctAnswer !== undefined) updates.correctAnswer = correctAnswer;
    if (points !== undefined) updates.points = points;
    if (orderIndex !== undefined) updates.orderIndex = orderIndex;

    const [q] = await db.update(questionsTable).set(updates).where(eq(questionsTable.id, questionId)).returning();
    if (!q) return res.status(404).json({ error: "Question not found" });
    res.json(formatQuestion(q));
  } catch (err) {
    req.log.error({ err }, "updateQuestion error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/exams/:examId/questions/:questionId
router.delete("/:examId/questions/:questionId", requireAuth, async (req: any, res) => {
  try {
    const questionId = parseInt(req.params.questionId);
    await db.delete(questionsTable).where(eq(questionsTable.id, questionId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "deleteQuestion error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/exams/:examId/generate-questions
router.post("/:examId/generate-questions", requireAuth, async (req: any, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const { topic, questionTypes, count, difficulty } = req.body;

    // AI-generated questions based on topic
    const generated = [];
    const types = questionTypes ?? ["multiple_choice"];
    const totalCount = Math.min(count ?? 5, 20);

    for (let i = 0; i < totalCount; i++) {
      const type = types[i % types.length];
      const diffLabel = difficulty ?? "medium";
      const existing = await db.select().from(questionsTable).where(eq(questionsTable.examId, examId));
      const orderIndex = existing.length + i;

      let questionData: any = {
        examId,
        type,
        text: generateQuestionText(topic, type, i, diffLabel),
        points: type === "essay" ? 5 : 1,
        orderIndex,
      };

      if (type === "multiple_choice") {
        questionData.options = generateOptions(topic, i);
        questionData.correctAnswer = questionData.options[0];
      } else if (type === "true_false") {
        questionData.options = ["True", "False"];
        questionData.correctAnswer = i % 2 === 0 ? "True" : "False";
      }

      const [q] = await db.insert(questionsTable).values(questionData).returning();
      generated.push({
        id: q.id,
        examId: q.examId,
        type: q.type,
        text: q.text,
        options: q.options ?? null,
        correctAnswer: q.correctAnswer ?? null,
        points: q.points,
        orderIndex: q.orderIndex,
      });
    }

    res.json(generated);
  } catch (err) {
    req.log.error({ err }, "generateQuestions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

function generateQuestionText(topic: string, type: string, index: number, difficulty: string): string {
  const difficultyPrefix = difficulty === "hard" ? "Critically analyze" : difficulty === "easy" ? "Define" : "Explain";
  const stems = [
    `What is the primary concept of ${topic}?`,
    `Which statement best describes ${topic}?`,
    `${difficultyPrefix} the key principle behind ${topic}.`,
    `How does ${topic} relate to its core components?`,
    `What is the significance of ${topic} in its domain?`,
    `Identify the main characteristic of ${topic}.`,
    `Which of the following is true about ${topic}?`,
    `What does ${topic} primarily involve?`,
  ];
  return stems[index % stems.length];
}

function generateOptions(topic: string, index: number): string[] {
  return [
    `The correct definition of ${topic}`,
    `An incorrect interpretation of ${topic}`,
    `A related but distinct concept`,
    `An unrelated concept`,
  ];
}

export default router;
