import { logger } from "./logger";

export interface RubricCriterion {
  criterion: string;
  maxPoints: number;
  description: string;
}

export interface AIGradingResult {
  score: number;
  feedback: string;
  rubricScores: { criterion: string; pointsEarned: number; maxPoints: number }[];
}

export async function gradeWithAI(
  questionText: string,
  studentAnswer: string,
  maxPoints: number,
  rubric: RubricCriterion[] | null,
  referenceSolution: string | null,
  apiKey?: string
): Promise<AIGradingResult> {
  const finalApiKey = apiKey || process.env.OPENROUTER_API_KEY;
  if (!finalApiKey || finalApiKey === "REPLACE_WITH_YOUR_OPENROUTER_KEY") {
    logger.warn("OpenRouter API key not configured. Returning mock AI grading.");
    return {
      score: Math.round(maxPoints * 0.8),
      feedback: "AI Grading mock: Solution looks good (no API Key configured).",
      rubricScores: rubric ? rubric.map(r => ({ criterion: r.criterion, pointsEarned: Math.round(r.maxPoints * 0.8), maxPoints: r.maxPoints })) : [],
    };
  }

  const rubricDescription = rubric && rubric.length > 0
    ? rubric.map((r, idx) => `${idx + 1}. ${r.criterion} (Max ${r.maxPoints} pts): ${r.description}`).join("\n")
    : "Evaluate the response overall on accuracy, logic, and correctness.";

  const prompt = `You are a high-precision academic grader. Evaluate the student's answer against the given question text, reference solution, and scoring rubric.

Question Text:
${questionText}

Reference Solution:
${referenceSolution || "Not provided."}

Max Question Points: ${maxPoints}

Scoring Rubric / Guidelines:
${rubricDescription}

Student's Submitted Answer:
${studentAnswer}

Provide your feedback and grade as a JSON object matching the following structure:
{
  "score": number (integer points awarded, must be between 0 and ${maxPoints}),
  "feedback": string (constructive, high-precision academic feedback referencing where the student excelled or made mistakes),
  "rubricScores": array of objects:
    [
      { "criterion": string, "pointsEarned": number, "maxPoints": number }
    ]
}

Only return the raw JSON object, no Markdown wrapper, no comments.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${finalApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errText}`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const result = JSON.parse(content);

    return {
      score: Number(result.score) || 0,
      feedback: result.feedback || "AI grading complete.",
      rubricScores: Array.isArray(result.rubricScores) ? result.rubricScores : [],
    };
  } catch (err) {
    logger.error({ err }, "gradeWithAI error");
    // Return graceful fallback instead of failing the entire submission pipeline
    return {
      score: 0,
      feedback: "AI grading failed to run. Manual review recommended.",
      rubricScores: [],
    };
  }
}
