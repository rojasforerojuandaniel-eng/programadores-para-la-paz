import { logger } from "@/lib/logger";
import { getCopRates } from "@/lib/fx-rates";

/**
 * Multi-currency conversion. Colombia is COP-centric but users may record
 * transactions in USD (or other currencies) — totals must be normalized to a
 * base currency using the live TRM (USD/COP) before summing.
 *
 * TRM source is the same Colombian rates feed used by the economic indicators
 * widget (tasas.agentes-ai.com.co). Cached for 1 hour to avoid hammering it.
 * Non-USD currencies (EUR, MXN, BRL, …) use cross-rates stored in the
 * CurrencyRate table by the /api/cron/fx-rates job (see lib/fx-rates.ts).
 */

const TRM_URL = "https://tasas.agentes-ai.com.co/api/snapshot.json";
const CACHE_TTL_MS = 60 * 60 * 1000;

interface TrmSnapshot {
  value: number;
  asOf: string;
  fetchedAt: number;
}

let cachedTrm: TrmSnapshot | null = null;

export interface TrmResult {
  value: number;
  asOf: string;
}

/** Returns the current USD→COP TRM, cached for CACHE_TTL_MS. */
export async function getTrm(): Promise<TrmResult | null> {
  if (cachedTrm && Date.now() - cachedTrm.fetchedAt < CACHE_TTL_MS) {
    return { value: cachedTrm.value, asOf: cachedTrm.asOf };
  }
  try {
    const response = await fetch(TRM_URL, { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error(`TRM feed returned ${response.status}`);
    const data = (await response.json()) as { macro?: { trm_cop?: number; trm_as_of?: string } };
    const value = data.macro?.trm_cop;
    const asOf = data.macro?.trm_as_of;
    if (typeof value !== "number" || !asOf) throw new Error("TRM feed missing data");
    cachedTrm = { value, asOf, fetchedAt: Date.now() };
    return { value, asOf };
  } catch (error) {
    logger.error("Failed to fetch TRM for currency conversion", {
      error: error instanceof Error ? error.message : String(error),
    });
    return cachedTrm ? { value: cachedTrm.value, asOf: cachedTrm.asOf } : null;
  }
}

/** Fallback TRM used only if the feed is unreachable and nothing is cached. */
export const FALLBACK_TRM = 4000;

/**
 * Converts an amount in a given currency to COP.
 * - COP: passthrough.
 * - USD: live TRM (Colombian source).
 * - Other currencies: cross-rate from the CurrencyRate table (populated by
 *   /api/cron/fx-rates). Falls back to unconverted if no rate is stored.
 */
export async function convertToCop(
  amount: number,
  fromCurrency: string,
  trm?: TrmResult | null,
  rates?: Record<string, number>
): Promise<{ cop: number; converted: boolean }> {
  const currency = fromCurrency.toUpperCase();
  if (currency === "COP" || !currency) return { cop: amount, converted: false };
  if (currency === "USD") {
    const rate = trm ?? (await getTrm());
    const value = rate?.value ?? FALLBACK_TRM;
    return { cop: amount * value, converted: true };
  }
  const rateMap = rates ?? (await getCopRates());
  const rate = rateMap[currency];
  if (typeof rate === "number" && rate > 0) {
    return { cop: amount * rate, converted: true };
  }
  // Unknown/unstored currency — cannot convert without a rate; return as-is.
  return { cop: amount, converted: false };
}

export interface PricedItem {
  amount: number;
  currency: string;
}

/**
 * Sums a list of {amount, currency} rows into COP, converting USD rows with the
 * live TRM and other currencies with stored cross-rates. Items in currencies we
 * cannot convert are summed separately so the caller can surface "includes $X in
 * unconverted <CUR>" if needed.
 */
export async function sumInCop(
  items: PricedItem[],
  trm?: TrmResult | null,
  rates?: Record<string, number>
): Promise<{
  totalCop: number;
  unconvertedByCurrency: Record<string, number>;
}> {
  const [rate, rateMap] = await Promise.all([
    trm ?? getTrm(),
    rates ?? getCopRates(),
  ]);
  let totalCop = 0;
  const unconvertedByCurrency: Record<string, number> = {};
  for (const item of items) {
    const { cop, converted } = await convertToCop(item.amount, item.currency, rate, rateMap);
    if (converted || item.currency.toUpperCase() === "COP" || !item.currency) {
      totalCop += cop;
    } else {
      const key = item.currency.toUpperCase();
      unconvertedByCurrency[key] = (unconvertedByCurrency[key] ?? 0) + item.amount;
    }
  }
  return { totalCop, unconvertedByCurrency };
}