import { getUserProfile } from "@/lib/auth";
import { withRateLimit } from "@/lib/with-rate-limit";
import { z } from "zod";

interface OcrResult {
  merchant: string;
  total: number;
  date: string;
  items: Array<{ description: string; amount: number }>;
  confidence: number;
}

const ocrSchema = z.object({
  imageUrl: z.string().min(1).max(100_000),
});

export const POST = withRateLimit(
  async (request: Request) => {
    const profile = await getUserProfile();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parseResult = ocrSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: parseResult.error.flatten() }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { imageUrl } = parseResult.data;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Extrae de este recibo: merchant (comercio), total (número), fecha (string ISO), items (array de objetos con description y amount). Responde solo JSON sin markdown ni explicaciones.`;

    let imageContent: unknown;
    const dataUrlMatch = imageUrl.match(/^data:([\w/\-+]+);base64,(.+)$/);
    if (dataUrlMatch) {
      const mediaType = dataUrlMatch[1];
      const base64Data = dataUrlMatch[2];
      imageContent = { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } };
    } else {
      imageContent = { type: "image", source: { type: "url", url: imageUrl } };
    }

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              imageContent,
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return new Response(JSON.stringify({ error: "AI request failed", detail: text }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const aiJson = (await aiResponse.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };

    const textContent = aiJson.content?.find((c) => c.type === "text")?.text ?? "";

    let result: OcrResult;
    try {
      const parsed = JSON.parse(textContent) as Partial<OcrResult>;
      result = {
        merchant: String(parsed.merchant ?? "Desconocido"),
        total: Number(parsed.total ?? 0),
        date: String(parsed.date ?? new Date().toISOString().split("T")[0]),
        items: Array.isArray(parsed.items)
          ? parsed.items.map((it) => ({
              description: String(it.description ?? ""),
              amount: Number(it.amount ?? 0),
            }))
          : [],
        confidence: 0.85,
      };
    } catch {
      result = {
        merchant: "Desconocido",
        total: 0,
        date: new Date().toISOString().split("T")[0],
        items: [],
        confidence: 0.0,
      };
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
  { key: "ai-ocr", maxRequests: 10, windowMs: 60000 }
);
