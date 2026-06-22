import { NextResponse } from "next/server";
import { fetchEconomicIndicators } from "@/lib/economic-indicators";
import { getLocale } from "@/lib/locale-server";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";

export const GET = withRateLimit(async function GET() {
  try {
    const locale = await getLocale();
    const result = await fetchEconomicIndicators(locale);
    logger.info("Economic indicators served", {
      indicatorsCount: result.indicators.length,
      isFallback: result.isFallback,
      lastUpdated: result.lastUpdated,
    });
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to serve economic indicators", { error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch economic indicators" },
      { status: 500 }
    );
  }
}, {"maxRequests": 100,"windowMs": 60000});
