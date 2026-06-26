import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, questionsTable, examsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
    referenceSolution: q.referenceSolution ?? null,
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
    const { type, text, options, correctAnswer, referenceSolution, points } = req.body;

    const existing = await db.select().from(questionsTable).where(eq(questionsTable.examId, examId));
    const orderIndex = existing.length;

    const [q] = await db
      .insert(questionsTable)
      .values({ 
        examId, 
        type, 
        text, 
        options: options ?? null, 
        correctAnswer: correctAnswer ?? null, 
        referenceSolution: referenceSolution ?? null, 
        points: points ?? 1, 
        orderIndex 
      })
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
    const { type, text, options, correctAnswer, referenceSolution, points, orderIndex } = req.body;
    const updates: any = {};
    if (type !== undefined) updates.type = type;
    if (text !== undefined) updates.text = text;
    if (options !== undefined) updates.options = options;
    if (correctAnswer !== undefined) updates.correctAnswer = correctAnswer;
    if (referenceSolution !== undefined) updates.referenceSolution = referenceSolution;
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

// ── OpenRouter AI question generation ──────────────────────────────────────────

interface AIQuestion {
  type: "multiple_choice" | "true_false" | "short_answer" | "essay";
  text: string;
  options?: string[];
  correctAnswer?: string;
  referenceSolution?: string;
  points: number;
}

async function generateWithOpenRouter(
  topic: string,
  count: number,
  difficulty: string,
  questionTypes: string[],
  aiConfig?: any
): Promise<AIQuestion[]> {
  // Determine API key & Model to use based on aiConfig
  let apiKey = process.env.OPENROUTER_API_KEY;
  let model = "google/gemma-2-9b-it:free"; // default free tier model
  let provider = "free";
  let apiEndpoint = "https://openrouter.ai/api/v1/chat/completions";

  if (aiConfig) {
    provider = aiConfig.provider || "free";
    if (provider === "custom_openrouter" && aiConfig.customApiKey) {
      apiKey = aiConfig.customApiKey;
      model = aiConfig.model || "google/gemma-2-9b-it:free";
    } else if (provider === "custom_gemini" && aiConfig.customApiKey) {
      apiKey = aiConfig.customApiKey;
      model = aiConfig.model || "gemini-2.5-flash";
      apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
    } else if (provider === "hosted") {
      // Hosted paid uses our own OpenRouter keys with premium models like deepseek v3/gemini 2.5
      apiKey = process.env.OPENROUTER_API_KEY;
      model = aiConfig.model || "deepseek/deepseek-chat";
    } else if (provider === "free") {
      apiKey = process.env.OPENROUTER_API_KEY;
      model = aiConfig.model || "google/gemma-2-9b-it:free";
    }
  }

  if (!apiKey || apiKey === "REPLACE_WITH_YOUR_OPENROUTER_KEY") {
    throw new Error(`API key not configured for provider: ${provider}`);
  }

  const typeDescriptions = questionTypes.map((t) => {
    if (t === "multiple_choice") return "multiple_choice (4 options, one correct)";
    if (t === "true_false") return 'true_false (options: ["True","False"])';
    if (t === "short_answer") return "short_answer (1-2 sentence expected answer)";
    if (t === "essay") return "essay (proof-based or detailed mathematical question requiring step-by-step logic)";
    return t;
  });

  const prompt = `You are an expert mathematician specializing in Olympiad-level problem creation (IMO, Putnam, national competitions). Generate exactly ${count} rigorous exam questions about the topic: "${topic}".

Difficulty level: ${difficulty} (interpret as: easy=foundational concepts, medium=competition level, hard=Olympiad championship level)
Question types to use (distribute evenly): ${typeDescriptions.join(", ")}

CRITICAL INSTRUCTIONS FOR OLYMPIAD-STYLE QUESTIONS:
1. For proof-based questions (essay type): These should be genuine mathematical proofs requiring logical reasoning, not just calculations
2. Questions must be self-contained with all necessary definitions
3. Use proper mathematical notation and LaTeX formatting throughout
4. Reference solutions must be complete, step-by-step proofs with clear logical flow
5. Avoid trivial or computational questions for hard difficulty - focus on conceptual depth
6. For geometry problems: include clear diagram descriptions when needed
7. For number theory: specify domains (e.g., "for all positive integers n")
8. For algebra: ensure equations are well-posed with unique solutions

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation, no code fences):
[
  {
    "type": "multiple_choice",
    "text": "Question text here with proper LaTeX notation like $x^2 + y^2 = 1$?",
    "options": ["Option A with $\\mathbb{R}$", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "points": 1
  },
  {
    "type": "true_false",
    "text": "Mathematical statement to evaluate (e.g., 'For all $n \\in \\mathbb{N}$, $n^2 \\geq n$')?",
    "options": ["True", "False"],
    "correctAnswer": "True",
    "points": 1
  },
  {
    "type": "short_answer",
    "text": "Question requiring a brief mathematical answer?",
    "correctAnswer": "Expected answer with LaTeX notation",
    "points": 2
  },
  {
    "type": "essay",
    "text": "Olympiad-style proof question (e.g., 'Prove that for any prime $p > 3$, $p^2 \\equiv 1 \\pmod{24}$')",
    "referenceSolution": "Complete rigorous proof with: (1) Clear statement of what to prove, (2) Step-by-step logical deductions, (3) Proper use of mathematical theorems, (4) LaTeX formatting for all math expressions",
    "points": 7
  }
]

Rules:
- For essay type: omit "options" and "correctAnswer" fields, but you MUST include "referenceSolution" containing a complete rigorous proof
- For short_answer type: omit "options", include "correctAnswer"  
- For multiple_choice: always 4 distinct plausible options, correctAnswer must match one exactly
- For true_false: options must be exactly ["True","False"]
- Points: multiple_choice=1, true_false=1, short_answer=2, essay=7
- Use standard LaTeX notation: $ for inline math ($x^2$), $$ for display math ($$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$)
- Common LaTeX: \\mathbb{R} (real numbers), \\mathbb{Z} (integers), \\mathbb{N} (natural numbers), \\pmod{n} (mod n), \\frac{a}{b} (fraction), \\sqrt{n} (square root)
- Make questions specific to "${topic}" with appropriate mathematical depth
- For hard difficulty: focus on proof techniques, clever insights, non-obvious connections
- Return ONLY the JSON array, nothing else`;

  // Models to attempt if free/default
  const modelsToTry = provider === "free" ? [
    model,
    "google/gemma-2-9b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free"
  ] : [model];

  let lastError = "";
  for (const currentModel of modelsToTry) {
    try {
      let content = "";
      if (provider === "custom_gemini") {
        const response = await fetch(`${apiEndpoint}?key=${apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json"
            }
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          lastError = `Gemini API error ${response.status}: ${errText}`;
          continue;
        }

        const data = await response.json() as any;
        content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        // OpenRouter or OpenRouter-compatible format
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://proctorAI.app",
            "X-Title": "ProctorAI",
          },
          body: JSON.stringify({
            model: currentModel,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 4000,
          }),
        });

        if (response.status === 429) {
          lastError = `Rate limited on ${currentModel}`;
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          lastError = `API error ${response.status} on ${currentModel}: ${errText}`;
          continue;
        }

        const data = await response.json() as any;
        content = data.choices?.[0]?.message?.content || "";
      }

      if (!content) { lastError = `No content from ${currentModel}`; continue; }

      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned) as AIQuestion[];

      if (!Array.isArray(parsed)) { lastError = `Invalid JSON from ${currentModel}`; continue; }
      return parsed.slice(0, count);
    } catch (err: any) {
      lastError = err.message;
      continue;
    }
  }

  throw new Error(`AI generation failed: ${lastError}`);
}

// POST /api/exams/:examId/generate-questions
router.post("/:examId/generate-questions", requireAuth, async (req: any, res) => {
  try {
    const examId = parseInt(req.params.examId);
    const { topic, questionTypes, count, difficulty } = req.body;
    const totalCount = Math.min(count ?? 5, 20);
    
    // Fetch the exam to get its aiConfig and examType
    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, examId));
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    // Determine question types based on examType
    let types = questionTypes;
    if (!types) {
      if (exam.examType === "proof_only") {
        types = ["essay"]; // Only proof-based questions for Olympiad style
      } else {
        types = ["multiple_choice", "true_false", "short_answer", "essay"];
      }
    } else if (exam.examType === "proof_only") {
      // Filter out MCQ and true_false for proof-only exams
      types = types.filter((t: string) => t !== "multiple_choice" && t !== "true_false");
      if (types.length === 0) types = ["essay"];
    }

    const existing = await db.select().from(questionsTable).where(eq(questionsTable.examId, examId));
    const startIndex = existing.length;

    let aiQuestions: AIQuestion[];

    try {
      aiQuestions = await generateWithOpenRouter(topic, totalCount, difficulty ?? "medium", types, exam.aiConfig);
    } catch (aiErr: any) {
      req.log.warn({ aiErr: aiErr.message }, "AI generation failed, using fallback generator");
      aiQuestions = generateFallbackQuestions(topic, totalCount, types, difficulty ?? "medium");
    }

    const generated = [];
    for (let i = 0; i < aiQuestions.length; i++) {
      const q = aiQuestions[i];
      const [saved] = await db.insert(questionsTable).values({
        examId,
        type: q.type,
        text: q.text,
        options: q.options ?? null,
        correctAnswer: q.correctAnswer ?? null,
        referenceSolution: q.referenceSolution ?? null,
        points: q.points ?? 1,
        orderIndex: startIndex + i,
      }).returning();
      generated.push(formatQuestion(saved));
    }

    res.json(generated);
  } catch (err) {
    req.log.error({ err }, "generateQuestions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

function generateFallbackQuestions(topic: string, count: number, types: string[], difficulty: string): AIQuestion[] {
  const diffLabel = difficulty === "hard" ? "Critically analyze" : difficulty === "easy" ? "Define" : "Explain";
  const questions: AIQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length] as AIQuestion["type"];
    if (type === "multiple_choice") {
      questions.push({
        type: "multiple_choice",
        text: `Which of the following best describes a key aspect of ${topic}?`,
        options: [
          `The primary mechanism of ${topic}`,
          `An unrelated concept`,
          `A secondary effect of ${topic}`,
          `The historical origin of ${topic}`,
        ],
        correctAnswer: `The primary mechanism of ${topic}`,
        points: 1,
      });
    } else if (type === "true_false") {
      questions.push({
        type: "true_false",
        text: `${topic} has a significant impact in its domain.`,
        options: ["True", "False"],
        correctAnswer: "True",
        points: 1,
      });
    } else if (type === "short_answer") {
      questions.push({
        type: "short_answer",
        text: `${diffLabel} the core concept of ${topic} in 1-2 sentences.`,
        correctAnswer: `${topic} refers to...`,
        points: 2,
      });
    } else {
      questions.push({
        type: "essay",
        text: `${diffLabel} the significance of ${topic} and its implications.`,
        points: 5,
      });
    }
  }
  return questions;
}

export default router;
