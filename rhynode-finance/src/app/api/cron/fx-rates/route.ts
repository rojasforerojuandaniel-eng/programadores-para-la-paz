import { NextResponse } from "next/server";
import { syncCurrencyRates } from "@/lib/fx-rates";
import { logger } from "@/lib/logger";

/**
 * Daily FX sync. Derives currency→COP cross-rates from a USD rate feed and
 * upserts them into CurrencyRate so convertToCop can normalize EUR/MXN/BRL/etc.
 * Protected by CRON_SECRET (Vercel Cron sends it as `authorization: Bearer …`).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const synced = await syncCurrencyRates();
    logger.info("FX rates sync complete", { synced });
    return NextResponse.json({ ok: true, synced });
  } catch (error) {
    logger.error("FX rates sync failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { ok: false, error: "FX sync failed" },
      { status: 500 }
    );
  }
}