import { logger } from "./logger";

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

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits,
  }).format(value);
}

function parseDate(value: string): string {
  const [day, month, year] = value.split("/");
  if (day && month && year) {
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return value;
}

function buildIndicators(snapshot: SnapshotResponse): EconomicIndicator[] {
  return [
    {
      id: "trm",
      name: "TRM",
      value: formatNumber(snapshot.macro.trm_cop, 2),
      unit: "COP/USD",
      date: parseDate(snapshot.macro.trm_as_of),
      source: "Banco de la República",
      trend: "flat",
      previousValue: "—",
      description: "Tasa de Cambio Representativa del Mercado",
    },
    {
      id: "tasa_intervencion",
      name: "Tasa de Intervención",
      value: formatNumber(snapshot.macro.tasa_politica_pct, 2),
      unit: "%",
      date: parseDate(snapshot.macro.trm_as_of),
      source: "Banco de la República",
      trend: "flat",
      previousValue: "—",
      description: `Meta de inflación: ${formatNumber(snapshot.macro.meta_inflacion_pct, 0)}% — próx. decisión ${snapshot.macro.proxima_decision}`,
    },
    {
      id: "inflacion",
      name: "Inflación Anual",
      value: formatNumber(snapshot.macro.inflacion_anual_pct, 2),
      unit: "% anual",
      date: snapshot.macro.inflacion_mes,
      source: "DANE",
      trend: snapshot.macro.inflacion_anual_pct > snapshot.macro.meta_inflacion_pct ? "up" : "down",
      previousValue: formatNumber(snapshot.macro.meta_inflacion_pct, 0),
      description: `Meta de inflación Banco de la República: ${formatNumber(snapshot.macro.meta_inflacion_pct, 0)}%`,
    },
    {
      id: "uvr",
      name: "UVR",
      value: formatNumber(snapshot.uvr.value_cop, 4),
      unit: "COP",
      date: snapshot.uvr.as_of,
      source: "Banco de la República",
      trend: snapshot.uvr.annual_pct > 0 ? "up" : "flat",
      previousValue: formatNumber(snapshot.uvr.annual_pct, 2),
      description: `Variación anual: ${formatNumber(snapshot.uvr.annual_pct, 2)}%`,
    },
    {
      id: "ibr",
      name: "IBR Overnight",
      value: formatNumber(snapshot.macro.ibr_overnight_pct, 3),
      unit: "% EA",
      date: parseDate(snapshot.macro.ibr_as_of),
      source: "Banco de la República",
      trend: "flat",
      previousValue: "—",
      description: "Índice Bancario de Referencia overnight",
    },
  ];
}

const fallbackIndicators: EconomicIndicator[] = [
  {
    id: "trm",
    name: "TRM",
    value: "3,950.00",
    unit: "COP/USD",
    date: "2026-06-15",
    source: "Banco de la República",
    trend: "flat",
    previousValue: "—",
    description: "Tasa de Cambio Representativa del Mercado",
  },
  {
    id: "tasa_intervencion",
    name: "Tasa de Intervención",
    value: "11.25",
    unit: "%",
    date: "2026-06-15",
    source: "Banco de la República",
    trend: "flat",
    previousValue: "—",
    description: "Meta de inflación: 3%",
  },
  {
    id: "inflacion",
    name: "Inflación Anual",
    value: "5.84",
    unit: "% anual",
    date: "Mayo 2026",
    source: "DANE",
    trend: "up",
    previousValue: "3",
    description: "Meta de inflación Banco de la República: 3%",
  },
  {
    id: "uvr",
    name: "UVR",
    value: "413.7628",
    unit: "COP",
    date: "2026-06-15",
    source: "Banco de la República",
    trend: "up",
    previousValue: "5.68",
    description: "Variación anual: 5.68%",
  },
  {
    id: "ibr",
    name: "IBR Overnight",
    value: "10.516",
    unit: "% EA",
    date: "2026-06-15",
    source: "Banco de la República",
    trend: "flat",
    previousValue: "—",
    description: "Índice Bancario de Referencia overnight",
  },
];

export interface IndicatorsResult {
  indicators: EconomicIndicator[];
  lastUpdated: string;
  source: string;
  attribution: string;
  isFallback: boolean;
}

export async function fetchEconomicIndicators(): Promise<IndicatorsResult> {
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
      indicators: buildIndicators(snapshot),
      lastUpdated: snapshot.meta.generated_at,
      source: snapshot.meta.source,
      attribution: snapshot.meta.attribution_required,
      isFallback: false,
    };
  } catch (error) {
    logger.error("Failed to fetch economic indicators, using fallback", { error: error instanceof Error ? error.message : String(error),
    });

    return {
      indicators: fallbackIndicators,
      lastUpdated: new Date().toISOString(),
      source: "Rhynode Finance (datos de referencia)",
      attribution: "Datos de referencia. Conecta la API de tasas.agentes-ai.com.co para valores actualizados.",
      isFallback: true,
    };
  }
}
