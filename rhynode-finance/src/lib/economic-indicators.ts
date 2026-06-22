import { logger } from "./logger";
import { formatNumber as formatNumberLocale } from "./format";
import type { Locale } from "./locale";

export interface EconomicIndicator {
  id: string;
  name: string;
  value: string;
  unit: string;
  date: string;
  source: string;
  trend: "up" | "down" | "flat";
  previousValue: string;
  description?: string;
}

interface SnapshotResponse {
  meta: {
    source: string;
    license: string;
    attribution_required: string;
    week_of: string;
    generated_at: string;
    sources: Record<string, string>;
  };
  macro: {
    tasa_politica_pct: number;
    proxima_decision: string;
    meta_inflacion_pct: number;
    inflacion_anual_pct: number;
    inflacion_mes: string;
    ibr_overnight_pct: number;
    ibr_as_of: string;
    trm_cop: number;
    trm_as_of: string;
  };
  uvr: {
    value_cop: number;
    annual_pct: number;
    as_of: string;
  };
}

const SNAPSHOT_URL = "https://tasas.agentes-ai.com.co/api/snapshot.json";
const CACHE_TAG = "economic-indicators";
const REVALIDATE_SECONDS = 3600;

function formatNumber(value: number, locale: Locale, maximumFractionDigits = 2): string {
  return formatNumberLocale(value, locale, { maximumFractionDigits });
}

function parseDate(value: string): string {
  const [day, month, year] = value.split("/");
  if (day && month && year) {
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return value;
}

function buildIndicators(snapshot: SnapshotResponse, locale: Locale): EconomicIndicator[] {
  const sources = locale === "en"
    ? { banrep: "Bank of the Republic", dane: "DANE" }
    : { banrep: "Banco de la República", dane: "DANE" };
  return [
    {
      id: "trm",
      name: locale === "en" ? "FX rate (COP)" : "TRM",
      value: formatNumber(snapshot.macro.trm_cop, locale, 2),
      unit: "COP/USD",
      date: parseDate(snapshot.macro.trm_as_of),
      source: sources.banrep,
      trend: "flat",
      previousValue: "—",
      description: locale === "en"
        ? "Market Representative Exchange Rate"
        : "Tasa de Cambio Representativa del Mercado",
    },
    {
      id: "tasa_intervencion",
      name: locale === "en" ? "Policy rate" : "Tasa de Intervención",
      value: formatNumber(snapshot.macro.tasa_politica_pct, locale, 2),
      unit: "%",
      date: parseDate(snapshot.macro.trm_as_of),
      source: sources.banrep,
      trend: "flat",
      previousValue: "—",
      description: locale === "en"
        ? `Inflation target: ${formatNumber(snapshot.macro.meta_inflacion_pct, locale, 0)}% — next decision ${snapshot.macro.proxima_decision}`
        : `Meta de inflación: ${formatNumber(snapshot.macro.meta_inflacion_pct, locale, 0)}% — próx. decisión ${snapshot.macro.proxima_decision}`,
    },
    {
      id: "inflacion",
      name: locale === "en" ? "Annual inflation" : "Inflación Anual",
      value: formatNumber(snapshot.macro.inflacion_anual_pct, locale, 2),
      unit: locale === "en" ? "% yearly" : "% anual",
      date: snapshot.macro.inflacion_mes,
      source: sources.dane,
      trend: snapshot.macro.inflacion_anual_pct > snapshot.macro.meta_inflacion_pct ? "up" : "down",
      previousValue: formatNumber(snapshot.macro.meta_inflacion_pct, locale, 0),
      description: locale === "en"
        ? `Bank of the Republic inflation target: ${formatNumber(snapshot.macro.meta_inflacion_pct, locale, 0)}%`
        : `Meta de inflación Banco de la República: ${formatNumber(snapshot.macro.meta_inflacion_pct, locale, 0)}%`,
    },
    {
      id: "uvr",
      name: "UVR",
      value: formatNumber(snapshot.uvr.value_cop, locale, 4),
      unit: "COP",
      date: snapshot.uvr.as_of,
      source: sources.banrep,
      trend: snapshot.uvr.annual_pct > 0 ? "up" : "flat",
      previousValue: formatNumber(snapshot.uvr.annual_pct, locale, 2),
      description: locale === "en"
        ? `Annual change: ${formatNumber(snapshot.uvr.annual_pct, locale, 2)}%`
        : `Variación anual: ${formatNumber(snapshot.uvr.annual_pct, locale, 2)}%`,
    },
    {
      id: "ibr",
      name: locale === "en" ? "IBR Overnight" : "IBR Overnight",
      value: formatNumber(snapshot.macro.ibr_overnight_pct, locale, 3),
      unit: "% EA",
      date: parseDate(snapshot.macro.ibr_as_of),
      source: sources.banrep,
      trend: "flat",
      previousValue: "—",
      description: locale === "en"
        ? "Overnight Bank Reference Index"
        : "Índice Bancario de Referencia overnight",
    },
  ];
}

function buildFallbackIndicators(locale: Locale): EconomicIndicator[] {
  const sources = locale === "en"
    ? { banrep: "Bank of the Republic", dane: "DANE" }
    : { banrep: "Banco de la República", dane: "DANE" };
  return [
    {
      id: "trm",
      name: locale === "en" ? "FX rate (COP)" : "TRM",
      value: formatNumber(3950, locale, 2),
      unit: "COP/USD",
      date: "2026-06-15",
      source: sources.banrep,
      trend: "flat",
      previousValue: "—",
      description: locale === "en"
        ? "Market Representative Exchange Rate"
        : "Tasa de Cambio Representativa del Mercado",
    },
    {
      id: "tasa_intervencion",
      name: locale === "en" ? "Policy rate" : "Tasa de Intervención",
      value: formatNumber(11.25, locale, 2),
      unit: "%",
      date: "2026-06-15",
      source: sources.banrep,
      trend: "flat",
      previousValue: "—",
      description: locale === "en" ? "Inflation target: 3%" : "Meta de inflación: 3%",
    },
    {
      id: "inflacion",
      name: locale === "en" ? "Annual inflation" : "Inflación Anual",
      value: formatNumber(5.84, locale, 2),
      unit: locale === "en" ? "% yearly" : "% anual",
      date: locale === "en" ? "May 2026" : "Mayo 2026",
      source: sources.dane,
      trend: "up",
      previousValue: formatNumber(3, locale, 0),
      description: locale === "en"
        ? "Bank of the Republic inflation target: 3%"
        : "Meta de inflación Banco de la República: 3%",
    },
    {
      id: "uvr",
      name: "UVR",
      value: formatNumber(413.7628, locale, 4),
      unit: "COP",
      date: "2026-06-15",
      source: sources.banrep,
      trend: "up",
      previousValue: formatNumber(5.68, locale, 2),
      description: locale === "en" ? "Annual change: 5.68%" : "Variación anual: 5.68%",
    },
    {
      id: "ibr",
      name: "IBR Overnight",
      value: formatNumber(10.516, locale, 3),
      unit: "% EA",
      date: "2026-06-15",
      source: sources.banrep,
      trend: "flat",
      previousValue: "—",
      description: locale === "en"
        ? "Overnight Bank Reference Index"
        : "Índice Bancario de Referencia overnight",
    },
  ];
}

export interface IndicatorsResult {
  indicators: EconomicIndicator[];
  lastUpdated: string;
  source: string;
  attribution: string;
  isFallback: boolean;
}

export async function fetchEconomicIndicators(locale: Locale = "es"): Promise<IndicatorsResult> {
  try {
    const response = await fetch(SNAPSHOT_URL, {
      next: { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] },
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Snapshot API returned ${response.status}`);
    }

    const snapshot = (await response.json()) as SnapshotResponse;

    return {
      indicators: buildIndicators(snapshot, locale),
      lastUpdated: snapshot.meta.generated_at,
      source: snapshot.meta.source,
      attribution: snapshot.meta.attribution_required,
      isFallback: false,
    };
  } catch (error) {
    logger.error("Failed to fetch economic indicators, using fallback", { error: error instanceof Error ? error.message : String(error),
    });

    return {
      indicators: buildFallbackIndicators(locale),
      lastUpdated: new Date().toISOString(),
      source: locale === "en"
        ? "Rhynode Finance (reference data)"
        : "Rhynode Finance (datos de referencia)",
      attribution: locale === "en"
        ? "Reference data. Connect the tasas.agentes-ai.com.co API for live values."
        : "Datos de referencia. Conecta la API de tasas.agentes-ai.com.co para valores actualizados.",
      isFallback: true,
    };
  }
}
