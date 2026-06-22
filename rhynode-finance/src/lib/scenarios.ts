import type { Locale } from "./locale";
import { formatCurrency as formatCurrencyLocale } from "./format";

export type ScenarioType = "optimistic" | "base" | "pessimistic";

export interface Scenario {
  id: string;
  name: string;
  type: ScenarioType;
  incomeAdjustment: number;
  expenseAdjustment: number;
  durationMonths: number;
  createdAt: string;
}

export interface ScenarioSummary {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  currency: string;
}

export interface ScenarioProjectionMonth {
  month: string;
  monthIndex: number;
  balance: number;
  baseline: number;
  net: number;
}

export interface ScenarioProjectionResult {
  projection: ScenarioProjectionMonth[];
  finalBalance: number;
  finalBaselineBalance: number;
  totalSavings: number;
  breakEvenMonth: number | null;
  deltaVsBaseline: number;
}

export function formatCurrency(amount: number, currency = "COP", locale: Locale = "es"): string {
  return formatCurrencyLocale(amount, currency, locale);
}

export function formatPercentage(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value}%`;
}

export function calculateScenarioProjection(
  scenario: Pick<
    Scenario,
    "incomeAdjustment" | "expenseAdjustment" | "durationMonths"
  >,
  summary: ScenarioSummary
): ScenarioProjectionResult {
  const now = new Date();
  const adjustedIncome = summary.monthlyIncome * (1 + scenario.incomeAdjustment / 100);
  const adjustedExpenses = summary.monthlyExpenses * (1 + scenario.expenseAdjustment / 100);
  const monthlyNet = adjustedIncome - adjustedExpenses;
  const baselineNet = summary.monthlyIncome - summary.monthlyExpenses;

  const projection: ScenarioProjectionMonth[] = [];
  let balance = summary.currentBalance;
  let baselineBalance = summary.currentBalance;
  let totalSavings = 0;
  let breakEvenMonth: number | null = null;

  for (let i = 0; i < scenario.durationMonths; i++) {
    balance += monthlyNet;
    baselineBalance += baselineNet;

    if (monthlyNet > 0) {
      totalSavings += monthlyNet;
    }

    if (balance < 0 && breakEvenMonth === null) {
      breakEvenMonth = i + 1;
    }

    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() + i, 1));
    projection.push({
      month: date.toISOString().slice(0, 7),
      monthIndex: i + 1,
      balance,
      baseline: baselineBalance,
      net: monthlyNet,
    });
  }

  return {
    projection,
    finalBalance: balance,
    finalBaselineBalance: baselineBalance,
    totalSavings,
    breakEvenMonth,
    deltaVsBaseline: balance - baselineBalance,
  };
}

export function getScenarioTypeLabel(type: ScenarioType, locale: Locale = "es"): string {
  const labels: Record<ScenarioType, Record<Locale, string>> = {
    optimistic: { es: "Optimista", en: "Optimistic" },
    base: { es: "Base", en: "Base" },
    pessimistic: { es: "Pesimista", en: "Pessimistic" },
  };
  return labels[type][locale];
}

export function sortScenarios(scenarios: Scenario[]): Scenario[] {
  return [...scenarios].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
