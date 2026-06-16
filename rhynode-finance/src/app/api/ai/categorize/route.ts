import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/auth";
import { suggestCategory } from "@/lib/categorizer";
import { withRateLimit } from "@/lib/with-rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const schema = z.object({
  description: z.string().min(1),
  amount: z.number(),
});

export const POST = withRateLimit(
  async (request: Request) => {
    try {
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const result = suggestCategory(parsed.data.description, parsed.data.amount);
      return NextResponse.json(result);
    } catch (error) {
      logger.error("AI categorize error", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ error: "Failed to categorize" }, { status: 500 });
    }
  },
  { key: "ai-categorize", maxRequests: 30, windowMs: 60000 }
);