import { getPrisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/decimal";
import { sumInCop } from "@/lib/currency";
import { formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/locale";

/** Pure inline es/en bifurcation. No message catalogs. */
const tr = (locale: Locale, es: string, en: string): string =>
  locale === "en" ? en : es;

/**
 * Colombian income tax (declaración de renta) estimator for natural persons,
 * based on the 2026 UVT table (Art. 241 ET). This is an ESTIMATE for planning —
 * not a substitute for an accountant. Uses the nominal 2026 brackets expressed
 * in COP (UVT ≈ 49.799 for 2026, rounded values below are illustrative).
 *
 * Deductions modeled: health (salud, capped 16% of income), education
 * (capped), mortgage interest (capped 32 UVT/month ~ dependent), dependents
 * (fixed allowance per dependent). Renta exenta: 25% of laboral income capped
 * at 5.940 UVT (~296M COP) for 2026.
 */

export const RENT_2026_UVT = 49799;

// 2026 nominal income tax brackets for individuals (COP). Source: Art. 241 ET
// expressed in COP using UVT 2026. Thresholds in COP (approximate, planning use).
const BRACKETS_2026 = [
  { upTo: 60_600_000, rate: 0 }, // 0–1090 UVT exento
  { upTo: 152_300_000, rate: 0.19 },
  { upTo: 316_700_000, rate: 0.24 },
  { upTo: 716_800_000, rate: 0.29 },
  { upTo: 1_526_400_000, rate: 0.33 },
  { upTo: Infinity, rate: 0.35 },
];

const RENTA_EXENTA_RATE = 0.25;
const RENTA_EXENTA_CAP_COP = 296_000_000; // ~5940 UVT 2026
const SALUD_DEDUCIBLE_RATE = 0.16;
const SALUD_DEDUCIBLE_CAP_COP = 432_000_000; // ~8640 UVT
const EDUCACION_DEDUCIBLE_CAP_COP = 432_000_000;
const VIVIENDA_DEDUCIBLE_CAP_COP = 1_200_000_000; // intereses hipotecarios, ~24000 UVT lifetime annual cap approx
const DEPENDIENTE_ALLOWANCE_COP = 3_200_000; // por dependiente (approx)

/** Progressive Colombian income tax over a taxable base (2026 brackets, COP). Pure. */
export function computeProgressiveTax(taxableBase: number): number {
  if (taxableBase <= 0) return 0;
  let tax = 0;
  let remaining = taxableBase;
  let previousCap = 0;
  for (const bracket of BRACKETS_2026) {
    const bracketWidth = bracket.upTo - previousCap;
    const taxableInBracket = Math.min(remaining, bracketWidth);
    if (taxableInBracket <= 0) break;
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
    previousCap = bracket.upTo;
    if (remaining <= 0) break;
  }
  return tax;
}

export interface RentDeclarationInput {
  userId: string;
  orgId: string | null;
  year: number;
  dependents?: number;
  locale?: Locale;
}

export interface RentDeclarationResult {
  year: number;
  grossIncome: number;
  exemptIncome: number;
  deductions: {
    health: number;
    education: number;
    housing: number;
    dependents: number;
    total: number;
  };
  taxableBase: number;
  tax: number;
  effectiveRate: number;
  notes: string[];
}

// Categories that count as deductible expenses by type (heuristic by category name).
const HEALTH_KEYWORDS = ["salud", "medic", "farmacia", "drogueria", "eps", "clinica", "odontolog", "optica", "seguro"];
const EDUCATION_KEYWORDS = ["educacion", "colegio", "universidad", "curso", "udemy", "coursera", "pluralsight", "matricula", "estudio"];
const HOUSING_KEYWORDS = ["hipoteca", "credito hipotecario", "vivienda", "arriendo", "interes hipotecario"];

function sumCategoryMatch<T extends { category: string | null; description: string }>(
  transactions: T[],
  keywords: string[]
): T[] {
  return transactions.filter((t) => {
    const haystack = `${t.category ?? ""} ${t.description}`.toLowerCase();
    return keywords.some((kw) => haystack.includes(kw));
  });
}

export async function computeRentDeclaration(
  input: RentDeclarationInput
): Promise<RentDeclarationResult> {
  const prisma = getPrisma();
  const { userId, orgId, year, dependents = 0, locale = "es" } = input;
  const notes: string[] = [];

  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

  // Income transactions: organization-scoped (business) or user-scoped (personal).
  const where = {
    date: { gte: start, lte: end },
    type: "INCOME",
    ...(orgId ? { organizationId: orgId } : { userId }),
  };
  const incomeTx = await prisma.transaction.findMany({
    where,
    select: { amount: true, currency: true, category: true, description: true },
  });

  const expenseWhere = {
    date: { gte: start, lte: end },
    type: "EXPENSE",
    ...(orgId ? { organizationId: orgId } : { userId }),
  };
  const expenseTx = await prisma.transaction.findMany({
    where: expenseWhere,
    select: { amount: true, currency: true, category: true, description: true },
  });

  const { totalCop: grossIncome } = await sumInCop(
    incomeTx.map((t) => ({ amount: decimalToNumber(t.amount), currency: t.currency }))
  );

  // Renta exenta laboral: 25% del ingreso laboral, capped.
  const exemptIncome = Math.min(grossIncome * RENTA_EXENTA_RATE, RENTA_EXENTA_CAP_COP);
  if (exemptIncome >= RENTA_EXENTA_CAP_COP) {
    notes.push(
      tr(
        locale,
        `Renta exenta limitada al tope de ${formatNumber(RENTA_EXENTA_CAP_COP, locale)} COP (2026).`,
        `Exempt income capped at ${formatNumber(RENTA_EXENTA_CAP_COP, locale)} COP (2026).`
      )
    );
  }

  // Deductible expenses by category keyword.
  const { totalCop: healthRaw } = await sumInCop(
    sumCategoryMatch(expenseTx, HEALTH_KEYWORDS).map((t) => ({ amount: decimalToNumber(t.amount), currency: t.currency }))
  );
  const health = Math.min(healthRaw * SALUD_DEDUCIBLE_RATE, SALUD_DEDUCIBLE_CAP_COP);

  const { totalCop: educationRaw } = await sumInCop(
    sumCategoryMatch(expenseTx, EDUCATION_KEYWORDS).map((t) => ({ amount: decimalToNumber(t.amount), currency: t.currency }))
  );
  const education = Math.min(educationRaw, EDUCACION_DEDUCIBLE_CAP_COP);

  const { totalCop: housingRaw } = await sumInCop(
    sumCategoryMatch(expenseTx, HOUSING_KEYWORDS).map((t) => ({ amount: decimalToNumber(t.amount), currency: t.currency }))
  );
  const housing = Math.min(housingRaw, VIVIENDA_DEDUCIBLE_CAP_COP);

  const dependentsDeduction = Math.max(0, dependents) * DEPENDIENTE_ALLOWANCE_COP;

  const totalDeductions = health + education + housing + dependentsDeduction;

  const taxableBase = Math.max(0, grossIncome - exemptIncome - totalDeductions);

  // Progressive tax over the taxable base.
  const tax = computeProgressiveTax(taxableBase);

  const effectiveRate = grossIncome > 0 ? tax / grossIncome : 0;

  notes.push(
    tr(
      locale,
      "Estimación de planeación con tabla DT 2026 (UVT 49.799). No sustituye a un contador.",
      "Planning estimate using the 2026 tax table (UVT 49,799). Does not replace an accountant."
    )
  );
  if (taxableBase === 0) {
    notes.push(
      tr(
        locale,
        "Base gravable en cero — no habría impuesto a cargo según esta estimación.",
        "Taxable base is zero — no tax would be owed under this estimate."
      )
    );
  }

  return {
    year,
    grossIncome,
    exemptIncome,
    deductions: { health, education, housing, dependents: dependentsDeduction, total: totalDeductions },
    taxableBase,
    tax,
    effectiveRate,
    notes,
  };
}