import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { computeFinancialInsights } from "@/lib/ai-financial-insights";
import {
  FinancialInsightsSchema,
  type FinancialInsights,
} from "@/lib/ai-financial-insights-schema";

export const dynamic = "force-dynamic";

const MAX_REQUESTS = 30;
const WINDOW_MS = 60000;

export async function GET(request: Request): Promise<NextResponse> {
  const profile = await getUserProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const limit = await rateLimit(
    `ai-financial-insights:${profile.id}:${ip}`,
    MAX_REQUESTS,
    WINDOW_MS
  );

  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit.limit),
          "X-RateLimit-Remaining": String(limit.remaining),
          "X-RateLimit-Reset": String(limit.resetAt),
        },
      }
    );
  }

  const prisma = getPrisma();
  const org = await prisma.organization.findUnique({
    where: { userId: profile.id },
    select: { id: true, currency: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  try {
    const insights: FinancialInsights = await computeFinancialInsights({
      userId: profile.id,
      orgId: org.id,
      currency: org.currency,
      scope: "PERSONAL",
    });

    const validated = FinancialInsightsSchema.parse(insights);

    return NextResponse.json(validated, {
      status: 200,
      headers: {
        "X-RateLimit-Limit": String(limit.limit),
        "X-RateLimit-Remaining": String(limit.remaining),
        "X-RateLimit-Reset": String(limit.resetAt),
      },
    });
  } catch (error) {
    logger.error("Failed to compute financial insights", {
      userId: profile.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to compute insights" },
      { status: 500 }
    );
  }
}
