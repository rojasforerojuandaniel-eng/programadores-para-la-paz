import { Prisma } from "@/generated/prisma/client";
import { decimalToNumber } from "@/lib/decimal";
import { logger } from "@/lib/logger";

export type InvestmentType =
  | "STOCK"
  | "BOND"
  | "CRYPTO"
  | "ETF"
  | "REAL_ESTATE"
  | "OTHER"
  | string;

export type PriceSource = "real" | "estimated" | "na";

export interface MarketPrice {
  price: number | null;
  currency: string;
  source: PriceSource;
  updatedAt: Date;
  note?: string;
}

export interface ResolvedInvestment {
  id: string;
  name: string;
  investmentType: string;
  currency: string;
  marketPrice: MarketPrice;
  estimatedValue: number;
  estimatedQuantity: number | null;
  investedAmount: number;
  gainAmount: number;
  gainPercent: number;
}

interface InvestmentInput {
  id: string;
  name: string;
  investmentType: string;
  externalId: string | null;
  currency: string;
  balance: Prisma.Decimal | number | string;
  investedAmount: Prisma.Decimal | number | string;
}

interface CoinListEntry {
  id: string;
  symbol: string;
  name: string;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        currency?: string;
      };
    }>;
    error?: { description?: string } | null;
  };
}

const PRICE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const COIN_LIST_TTL_MS = 60 * 60 * 1000; // 1 hour
const REQUEST_TIMEOUT_MS = 5000;

const priceCache = new Map<string, MarketPrice>();
let coinListCache: CoinListEntry[] | null = null;
let coinListCacheExpiresAt = 0;

function now() {
  return Date.now();
}

function cacheKey(type: string, symbol: string, currency: string) {
  return `${type.toUpperCase()}:${symbol.toUpperCase()}:${currency.toUpperCase()}`;
}

function getCachedPrice(key: string): MarketPrice | null {
  const entry = priceCache.get(key);
  if (!entry) return null;
  if (now() - entry.updatedAt.getTime() > PRICE_TTL_MS) {
    priceCache.delete(key);
    return null;
  }
  return entry;
}

function setCachedPrice(key: string, price: MarketPrice) {
  priceCache.set(key, price);
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function stringHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function generateFallbackPrice(
  symbol: string,
  currency: string,
  kind: "crypto" | "stock"
): MarketPrice {
  const hash = stringHash(symbol.toUpperCase());
  let price: number;
  if (kind === "crypto") {
    const ranges = [0.0001, 0.01, 1, 50, 500, 50_000];
    const tier = hash % ranges.length;
    const min = tier === 0 ? ranges[0] : ranges[tier - 1];
    const max = ranges[tier];
    const fraction = (hash % 10_000) / 10_000;
    price = min + fraction * (max - min);
  } else {
    price = 5 + ((hash % 100_000) / 100_000) * 995;
  }
  return {
    price: Number(price.toFixed(4)),
    currency,
    source: "estimated",
    updatedAt: new Date(),
    note: "Datos de ejemplo",
  };
}

async function fetchCoinList(): Promise<CoinListEntry[] | null> {
  if (coinListCache && coinListCacheExpiresAt > now()) {
    return coinListCache;
  }
  try {
    const res = await fetchWithTimeout(
      "https://api.coingecko.com/api/v3/coins/list",
      { next: { revalidate: 3600 } },
      8000
    );
    if (!res.ok) {
      throw new Error(`CoinGecko coin list returned ${res.status}`);
    }
    const data = (await res.json()) as CoinListEntry[];
    coinListCache = data.map((coin) => ({
      id: coin.id,
      symbol: coin.symbol.toLowerCase(),
      name: coin.name,
    }));
    coinListCacheExpiresAt = now() + COIN_LIST_TTL_MS;
    return coinListCache;
  } catch (error) {
    logger.warn("Failed to fetch CoinGecko coin list", {
      error: error instanceof Error ? error.message : String(error),
    });
    return coinListCache;
  }
}

async function resolveCoinGeckoId(symbol: string): Promise<string | null> {
  const list = await fetchCoinList();
  if (!list) return null;
  const normalizedSymbol = symbol.toLowerCase().trim();
  const match =
    list.find((coin) => coin.symbol === normalizedSymbol) ||
    list.find((coin) => coin.id === normalizedSymbol);
  return match?.id ?? null;
}

async function fetchCryptoPrice(
  symbol: string,
  currency: string
): Promise<MarketPrice> {
  const key = cacheKey("CRYPTO", symbol, currency);
  const cached = getCachedPrice(key);
  if (cached) return cached;

  const id = await resolveCoinGeckoId(symbol);
  if (!id) {
    const fallback = generateFallbackPrice(symbol, currency, "crypto");
    fallback.note = "Símbolo no encontrado en CoinGecko. Datos de ejemplo.";
    setCachedPrice(key, fallback);
    return fallback;
  }

  const vsCurrency = currency.toLowerCase();
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    id
  )}&vs_currencies=${encodeURIComponent(vsCurrency)}`;

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      throw new Error(`CoinGecko price returned ${res.status}`);
    }
    const data = (await res.json()) as Record<string, Record<string, number>>;
    const price = data?.[id]?.[vsCurrency];
    if (typeof price !== "number") {
      throw new Error("CoinGecko price response missing price field");
    }
    const result: MarketPrice = {
      price,
      currency,
      source: "real",
      updatedAt: new Date(),
    };
    setCachedPrice(key, result);
    return result;
  } catch (error) {
    logger.warn("Failed to fetch crypto price, using fallback", {
      symbol,
      currency,
      error: error instanceof Error ? error.message : String(error),
    });
    const fallback = generateFallbackPrice(symbol, currency, "crypto");
    setCachedPrice(key, fallback);
    return fallback;
  }
}

async function fetchStockPrice(symbol: string): Promise<MarketPrice> {
  const key = cacheKey("STOCK", symbol, "USD");
  const cached = getCachedPrice(key);
  if (cached) return cached;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=1d&range=1d`;

  try {
    const res = await fetchWithTimeout(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Yahoo Finance returned ${res.status}`);
    }
    const json = (await res.json()) as YahooChartResponse;
    const result = json.chart?.result?.[0];
    const meta = result?.meta;
    const price = meta?.regularMarketPrice ?? meta?.previousClose ?? null;
    if (typeof price !== "number") {
      throw new Error("Yahoo Finance response missing market price");
    }
    const resultPrice: MarketPrice = {
      price,
      currency: meta?.currency || "USD",
      source: "real",
      updatedAt: new Date(),
    };
    setCachedPrice(key, resultPrice);
    return resultPrice;
  } catch (error) {
    logger.warn("Failed to fetch stock price, using fallback", {
      symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    const fallback = generateFallbackPrice(symbol, "USD", "stock");
    setCachedPrice(key, fallback);
    return fallback;
  }
}

function notAvailablePrice(currency: string, note: string): MarketPrice {
  return {
    price: null,
    currency,
    source: "na",
    updatedAt: new Date(),
    note,
  };
}

export async function getMarketPrice(
  investmentType: string,
  symbol: string | null | undefined,
  currency: string
): Promise<MarketPrice> {
  const trimmedSymbol = symbol?.trim();
  const type = investmentType.toUpperCase();

  if (!trimmedSymbol) {
    return notAvailablePrice(currency, "Sin símbolo/ticker registrado");
  }

  if (type === "CRYPTO") {
    return fetchCryptoPrice(trimmedSymbol, currency);
  }

  if (type === "STOCK" || type === "ETF") {
    return fetchStockPrice(trimmedSymbol);
  }

  return notAvailablePrice(currency, "Cotización no disponible para este tipo de activo");
}

export async function resolveInvestmentPrices(
  investments: InvestmentInput[]
): Promise<ResolvedInvestment[]> {
  return Promise.all(
    investments.map(async (investment) => {
      const balance = decimalToNumber(investment.balance);
      const investedAmount = decimalToNumber(investment.investedAmount);
      const marketPrice = await getMarketPrice(
        investment.investmentType,
        investment.externalId,
        investment.currency
      );

      // The Prisma schema does not store quantity, so the estimated value is the
      // recorded balance. A rough unit estimate is shown only when the price
      // currency matches the investment currency to avoid misleading conversions.
      const estimatedValue = balance;
      const estimatedQuantity =
        marketPrice.price &&
        marketPrice.price > 0 &&
        marketPrice.currency.toUpperCase() === investment.currency.toUpperCase()
          ? Number((balance / marketPrice.price).toFixed(6))
          : null;

      const gainAmount = estimatedValue - investedAmount;
      const gainPercent = investedAmount > 0 ? (gainAmount / investedAmount) * 100 : 0;

      return {
        id: investment.id,
        name: investment.name,
        investmentType: investment.investmentType,
        currency: investment.currency,
        marketPrice,
        estimatedValue,
        estimatedQuantity,
        investedAmount,
        gainAmount,
        gainPercent,
      };
    })
  );
}
