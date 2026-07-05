import { logger } from "./logger";

export async function performOcr(attachmentUrl: string, apiKey?: string): Promise<string> {
  const finalApiKey = apiKey || process.env.OPENROUTER_API_KEY;
  if (!finalApiKey || finalApiKey === "REPLACE_WITH_YOUR_OPENROUTER_KEY") {
    logger.warn("OpenRouter API key not configured. Returning fallback OCR text.");
    return "[OCR Placeholder: Solution image uploaded]";
  }

  // If the attachment is not a base64 data URI or HTTP URL, we cannot send it
  let imageUrl = attachmentUrl;
  if (!imageUrl.startsWith("data:") && !imageUrl.startsWith("http")) {
    logger.warn("OCR skipped: Attachment is not a data URI or external URL");
    return "[OCR Error: Invalid image URL]";
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${finalApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Transcribe the handwritten text and mathematical formulas in this image. Convert all equations into LaTeX format wrapped in appropriate markers (like $...$ or $$...$$). Output only the transcription, do not add any comments, intro, or markdown wrapper like ```.",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errText}`);
    }

    const data: any = await response.json();
    const transcript = data.choices?.[0]?.message?.content || "";
    return transcript.trim();
  } catch (err) {
    logger.error({ err }, "performOcr error");
    throw err;
  }
}
