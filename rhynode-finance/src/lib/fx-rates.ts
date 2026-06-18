import { getPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * FX rates for multi-currency normalization to COP.
 *
 * USD→COP comes from the Colombian TRM feed (lib/currency.ts) and remains the
 * authoritative anchor. Every other currency (EUR, MXN, BRL, ARS, CLP, PEN, …)
 * is converted to COP via a USD cross-rate: rate_CUR_COP = usdCop / usdCur.
 *
 * Source: open.er-api.com (free, no API key) returns USD→* rates. The cron
 * /api/cron/fx-rates runs daily, derives COP rates, and upserts them into the
 * CurrencyRate table. convertToCop reads the latest stored rates (cached 1h)
 * so request paths don't hit the network or DB on every call.
 */

const FX_URL = "https://open.er-api.com/v6/latest/USD";
const RATES_CACHE_TTL_MS = 60 * 60 * 1000;

/** Currencies supported beyond COP/USD. Keep aligned with what the UI offers. */
export const SUPPORTED_FX_CURRENCIES = [
  "EUR",
  "MXN",
  "BRL",
  "ARS",
  "CLP",
  "PEN",
] as const;

export type SupportedFx = (typeof SUPPORTED_FX_CURRENCIES)[number];

interface ErApiRates {
  result: string;
  rates?: Record<string, number>;
}

/**
 * Derives currency→COP rates from a USD-based rate map.
 * Pure function — unit-tested. `usdRates[code]` is the value of 1 USD in `code`.
 */
export function deriveCopRates(
  usdRates: Record<string, number>
): Record<string, number> {
  const usdToCop = usdRates["COP"];
  if (!usdToCop || usdToCop <= 0) return {};
  const out: Record<string, number> = {};
  for (const cur of SUPPORTED_FX_CURRENCIES) {
    const usdToCur = usdRates[cur];
    if (usdToCur && usdToCur > 0) {
      out[cur] = usdToCop / usdToCur;
    }
  }
  return out;
}

async function fetchUsdRates(): Promise<Record<string, number> | null> {
  try {
    const response = await fetch(FX_URL, { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error(`FX feed returned ${response.status}`);
    const data = (await response.json()) as ErApiRates;
    if (data.result !== "success" || !data.rates) {
      throw new Error("FX feed missing rates");
    }
    return data.rates;
  } catch (error) {
    logger.error("Failed to fetch USD rates", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Fetches USD rates and upserts derived currency→COP rates into CurrencyRate.
 * Also prunes rows older than 14 days to keep the table bounded.
 * Returns the number of currencies synced.
 */
export async function syncCurrencyRates(): Promise<number> {
  const usdRates = await fetchUsdRates();
  if (!usdRates) return 0;
  const copRates = deriveCopRates(usdRates);
  const prisma = getPrisma();
  const date = new Date();
  let count = 0;
  for (const [cur, rate] of Object.entries(copRates)) {
    await prisma.currencyRate.upsert({
      where: {
        fromCurrency_toCurrency_date: {
          fromCurrency: cur,
          toCurrency: "COP",
          date,
        },
      },
      create: {
        fromCurrency: cur,
        toCurrency: "COP",
        rate,
        date,
        source: "er-api",
      },
      update: {
        rate,
        source: "er-api",
      },
    });
    count++;
  }
  // Prune rows older than 14 days.
  const cutoff = new Date(date.getTime() - 14 * 24 * 60 * 60 * 1000);
  await prisma.currencyRate.deleteMany({
    where: { date: { lt: cutoff } },
  }).catch((error: unknown) => {
    logger.warn("Failed to prune old currency rates", {
      error: error instanceof Error ? error.message : String(error),
    });
  });
  return count;
}

let cachedRates: { rates: Record<string, number>; fetchedAt: number } | null = null;

/**
 * Returns the latest currency→COP rates from the DB, cached 1h. Currencies
 * with no stored rate are simply absent from the map (caller treats them as
 * unconverted).
 */
export async function getCopRates(): Promise<Record<string, number>> {
  if (cachedRates && Date.now() - cachedRates.fetchedAt < RATES_CACHE_TTL_MS) {
    return cachedRates.rates;
  }
  try {
    const prisma = getPrisma();
    const rows = await prisma.currencyRate.findMany({
      where: { toCurrency: "COP" },
      orderBy: { date: "desc" },
      distinct: ["fromCurrency"],
      select: { fromCurrency: true, rate: true },
    });
    const rates: Record<string, number> = {};
    for (const row of rows) {
      rates[row.fromCurrency.toUpperCase()] = row.rate;
    }
    cachedRates = { rates, fetchedAt: Date.now() };
    return rates;
  } catch (error) {
    logger.error("Failed to load COP rates from DB", {
      error: error instanceof Error ? error.message : String(error),
    });
    return cachedRates?.rates ?? {};
  }
}

/** Test-only: clears the in-memory rates cache. */
export function __clearCopRatesCache(): void {
  cachedRates = null;
}