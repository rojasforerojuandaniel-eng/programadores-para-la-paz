import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/with-rate-limit";
import { getUserProfile } from "@/lib/auth";
import { generateRuleSuggestions } from "@/lib/rules-suggestions";
import { logger } from "@/lib/logger";
import { z } from "zod";

const querySchema = z.object({
  minFrequency: z.coerce.number().min(1).default(2),
  lookbackDays: z.coerce.number().min(7).max(365).default(90),
  maxSuggestions: z.coerce.number().min(1).max(50).default(10),
});

export const GET = withRateLimit(
  async (request: Request) => {
    try {
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const parsedQuery = querySchema.safeParse({
        minFrequency: searchParams.get("minFrequency") ?? undefined,
        lookbackDays: searchParams.get("lookbackDays") ?? undefined,
        maxSuggestions: searchParams.get("maxSuggestions") ?? undefined,
      });
      if (!parsedQuery.success) {
        return NextResponse.json(
          { error: "Invalid query parameters", details: parsedQuery.error.flatten() },
          { status: 400 }
        );
      }

      const suggestions = await generateRuleSuggestions(profile.id, parsedQuery.data);
      return NextResponse.json({ suggestions });
    } catch (error) {
      logger.error("Failed to generate rule suggestions", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to generate suggestions" },
        { status: 500 }
      );
    }
  },
  { key: "rules-suggestions", maxRequests: 20, windowMs: 60000 }
);
