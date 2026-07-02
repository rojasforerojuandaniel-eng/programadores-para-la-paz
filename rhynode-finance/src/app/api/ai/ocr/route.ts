import { getUserProfileFromRequest, clerkUserIdFromRequest } from "@/lib/auth";
import { withRateLimit } from "@/lib/with-rate-limit";
import { createChatCompletionText, isAIConfigured } from "@/lib/ai-provider";
import { z } from "zod";
import { logger } from "@/lib/logger";

interface OcrResult {
  merchant: string;
  total: number;
  date: string;
  items: Array<{ description: string; amount: number }>;
  confidence: number;
}

const DEFAULT_STORAGE_HOSTS = ["public.blob.vercel-storage.com"];
const ALLOWED_STORAGE_HOSTS =
  process.env.ALLOWED_STORAGE_HOSTS?.split(",").map((host) => host.trim()) ??
  DEFAULT_STORAGE_HOSTS;

function isOwnStorageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_STORAGE_HOSTS.some(
      (host) =>
        parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

function isOwnReceiptForUser(url: string, userId: string): boolean {
  if (!isOwnStorageUrl(url)) return false;
  try {
    const pathname = new URL(url).pathname;
    return pathname.startsWith(`/receipts/${userId}/`);
  } catch {
    return false;
  }
}

const ocrSchema = z.object({
  imageUrl: z.string().url().max(2_000),
});

export const POST = withRateLimit(
  async (request: Request) => {
    const profile = await getUserProfileFromRequest(request);
    if (!profile) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parseResult = ocrSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid input",
          details: parseResult.error.flatten(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { imageUrl } = parseResult.data;

    if (!isOwnStorageUrl(imageUrl)) {
      return new Response(
        JSON.stringify({ error: "Invalid image URL" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!isOwnReceiptForUser(imageUrl, profile.id)) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!isAIConfigured()) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `Extrae de este recibo: merchant (comercio), total (número), fecha (string ISO), items (array de objetos con description y amount). Responde solo JSON sin markdown ni explicaciones.`;

    let textContent: string;
    try {
      textContent = await createChatCompletionText({
        maxTokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image", url: imageUrl },
            ],
          },
        ],
      });
    } catch (error) {
      logger.error("OCR AI request failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return new Response(
        JSON.stringify({ error: "AI request failed" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

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
  { key: "ai-ocr", maxRequests: 10, windowMs: 60000, identifier: clerkUserIdFromRequest }
);
