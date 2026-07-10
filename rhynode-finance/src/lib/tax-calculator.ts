import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/lib/locale";

export type TFn = (key: string, values?: Record<string, string | number>) => string;

export type TaxType = "IVA" | "ReteFuente" | "ICA";

export const ICA_CITY_KEYS = {
  bogota: "icaCities.bogota",
  medellin: "icaCities.medellin",
  cali: "icaCities.cali",
  barranquilla: "icaCities.barranquilla",
  cartagena: "icaCities.cartagena",
  bucaramanga: "icaCities.bucaramanga",
} as const;

export type IcaCityKey = keyof typeof ICA_CITY_KEYS;

export const icaRates: Record<IcaCityKey, { perThousand: number }> = {
  bogota: { perThousand: 9.66 },
  medellin: { perThousand: 13.8 },
  cali: { perThousand: 10.2 },
  barranquilla: { perThousand: 7.0 },
  cartagena: { perThousand: 8.2 },
  bucaramanga: { perThousand: 11.0 },
};

export const MAX_SLIDER_AMOUNT = 50_000_000;
export const SLIDER_STEP = 100_000;

export interface CalculationResult {
  base: number;
  deductions: number;
  taxableBase: number;
  taxType: TaxType;
  city?: IcaCityKey;
  rate: number;
  rateLabel: string;
  tax: number;
  total: number;
  netPayable?: number;
  generatedAt: string;
}

export function getIcaCityLabel(
  city: IcaCityKey | string,
  t: (key: string) => string
): string {
  const key = ICA_CITY_KEYS[city as IcaCityKey];
  return key ? t(key) : city;
}

export function formatCOP(amount: number, locale: Locale): string {
  return formatCurrency(amount, "COP", locale);
}

export function getReteFuenteRate(amount: number): number {
  if (amount <= 1_000_000) return 0;
  if (amount <= 5_000_000) return 0.01;
  if (amount <= 10_000_000) return 0.02;
  if (amount <= 50_000_000) return 0.03;
  return 0.04;
}

export function formatRate(
  rate: number,
  taxType: TaxType,
  city?: IcaCityKey
): string {
  if (taxType === "ICA") {
    const perThousand = city ? icaRates[city]?.perThousand : undefined;
    return perThousand ? `${perThousand}‰` : "9.66‰";
  }
  if (rate === 0) return "0%";
  return `${(rate * 100).toFixed(rate % 0.01 === 0 ? 0 : 1)}%`;
}

export function clampAmount(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function calculate(
  base: number,
  deductions: number,
  taxType: TaxType,
  city?: IcaCityKey
): CalculationResult {
  const safeBase = Math.max(0, base);
  const safeDeductions = Math.max(0, Math.min(deductions, safeBase));
  const taxableBase = safeBase - safeDeductions;
  const now = new Date().toISOString();

  if (taxType === "IVA") {
    const rate = 0.19;
    const generated = safeBase * rate;
    const deductible = safeDeductions * rate;
    const netPayable = Math.max(0, generated - deductible);
    return {
      base: safeBase,
      deductions: safeDeductions,
      taxableBase,
      taxType,
      rate,
      rateLabel: formatRate(rate, taxType),
      tax: generated,
      total: safeBase + generated,
      netPayable,
      generatedAt: now,
    };
  }

  if (taxType === "ReteFuente") {
    const rate = getReteFuenteRate(safeBase);
    const tax = safeBase * rate;
    return {
      base: safeBase,
      deductions: 0,
      taxableBase: safeBase,
      taxType,
      rate,
      rateLabel: formatRate(rate, taxType),
      tax,
      total: safeBase - tax,
      generatedAt: now,
    };
  }

  const perThousand = city ? icaRates[city]?.perThousand : 9.66;
  const rate = perThousand / 1000;
  const tax = safeBase * rate;
  return {
    base: safeBase,
    deductions: 0,
    taxableBase: safeBase,
    taxType,
    city,
    rate,
    rateLabel: formatRate(rate, taxType, city),
    tax,
    total: safeBase + tax,
    generatedAt: now,
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
