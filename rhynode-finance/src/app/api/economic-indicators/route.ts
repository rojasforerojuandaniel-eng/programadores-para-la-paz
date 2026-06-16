import { NextResponse } from "next/server";
import { fetchEconomicIndicators } from "@/lib/economic-indicators";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const result = await fetchEconomicIndicators();
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
}
