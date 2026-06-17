import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { logger } from "@/lib/logger";
import { computeFinancialInsights } from "@/lib/ai-financial-insights";
import {
  FinancialInsightsSchema,
  type FinancialInsights,
} from "@/lib/ai-financial-insights-schema";

export const dynamic = "force-dynamic";

export const GET = withRateLimit(async function GET(): Promise<NextResponse> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();
    const org = await prisma.organization.findUnique({
      where: { userId: profile.id },
      select: { id: true, currency: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const insights: FinancialInsights = await computeFinancialInsights({
      userId: profile.id,
      orgId: org.id,
      currency: org.currency,
      scope: "PERSONAL",
    });

    const validated = FinancialInsightsSchema.parse(insights);

    return NextResponse.json(validated, { status: 200 });
  } catch (error) {
    logger.error("Failed to compute financial insights", {
      userId: (await getUserProfile())?.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to compute insights" },
      { status: 500 }
    );
  }
}, { maxRequests: 10, windowMs: 60000 });
