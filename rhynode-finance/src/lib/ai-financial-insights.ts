import { getPrisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/decimal";
import {
  FinancialInsightsSchema,
  type FinancialInsights,
} from "@/lib/ai-financial-insights-schema";

interface MonthRange {
  start: Date;
  end: Date;
}

interface ComputeInputs {
  userId: string;
  orgId: string;
  currency: string;
  scope?: "PERSONAL" | "BUSINESS" | string;
}

const SAVINGS_RATE_HEALTHY = 0.2;
const SAVINGS_RATE_ALERT = 0.1;
const BUDGET_OVERSPENT_THRESHOLD = 1.1;
const BUDGET_NEAR_LIMIT_THRESHOLD = 0.8;
const TOP_CATEGORY_INCOME_SHARE_ALERT = 0.3;
const GOAL_NEAR_COMPLETION_THRESHOLD = 0.75;
const TREND_UP_THRESHOLD = 1.05;
const TREND_DOWN_THRESHOLD = 0.95;

function getMonthRange(now: Date, offsetMonths = 0): MonthRange {
  const year = now.getFullYear();
  const month = now.getMonth() + offsetMonths;
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function sumByCategory(
  transactions: { category: string | null; amount: number }[]
): { name: string; amount: number } | null {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (!t.category) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  let top: { name: string; amount: number } | null = null;
  for (const [name, amount] of map.entries()) {
    if (!top || amount > top.amount) {
      top = { name, amount };
    }
  }
  return top;
}

function determineTrend(currentNet: number, previousNet: number): "up" | "down" | "stable" {
  if (previousNet === 0) {
    if (currentNet > 0) return "up";
    if (currentNet < 0) return "down";
    return "stable";
  }
  const ratio = currentNet / previousNet;
  if (ratio > TREND_UP_THRESHOLD) return "up";
  if (ratio < TREND_DOWN_THRESHOLD) return "down";
  return "stable";
}

function determineHealth(
  income: number,
  expense: number,
  budgets: { amount: number; spent: number }[]
): "saludable" | "alerta" | "crítica" {
  if (income <= 0) {
    return expense > 0 ? "crítica" : "alerta";
  }

  const savingsRate = (income - expense) / income;
  const overspent = budgets.some(
    (b) => b.amount > 0 && b.spent > b.amount * BUDGET_OVERSPENT_THRESHOLD
  );
  const nearLimit = budgets.some(
    (b) => b.amount > 0 && b.spent >= b.amount * BUDGET_NEAR_LIMIT_THRESHOLD && b.spent <= b.amount
  );

  if (savingsRate < 0 || overspent) return "crítica";
  if (savingsRate < SAVINGS_RATE_ALERT || nearLimit) return "alerta";
  if (savingsRate >= SAVINGS_RATE_HEALTHY && !nearLimit) return "saludable";
  return "alerta";
}

function buildRecommendations(
  income: number,
  expense: number,
  savingsRate: number,
  topCategory: { name: string; amount: number } | null,
  budgets: { name: string; amount: number; spent: number }[],
  goals: { name: string; targetAmount: number; currentAmount: number }[],
  currency: string
): string[] {
  const recommendations: string[] = [];

  if (income <= 0) {
    recommendations.push(
      "No registras ingresos este mes. Carga tu nómina o ingresos para un análisis real."
    );
  } else if (expense > income) {
    recommendations.push(
      `Tus gastos (${formatCurrency(expense, currency)}) superan tus ingresos (${formatCurrency(
        income,
        currency
      )}). Revisa gastos discrecionales.`
    );
  } else if (savingsRate >= SAVINGS_RATE_HEALTHY * 100) {
    recommendations.push(
      `Excelente: estás ahorrando el ${savingsRate.toFixed(0)}% de tus ingresos. Considera acelerar una meta.`
    );
  } else if (savingsRate < SAVINGS_RATE_ALERT * 100) {
    recommendations.push(
      `Tu tasa de ahorro es del ${savingsRate.toFixed(0)}%. El ideal mínimo es 20%; revisa gastos hormiga.`
    );
  }

  for (const budget of budgets) {
    if (budget.amount <= 0) continue;
    const pct = (budget.spent / budget.amount) * 100;
    if (pct > 100) {
      recommendations.push(
        `Presupuesto "${budget.name}" excedido (${pct.toFixed(0)}%). Congela gastos en esa categoría.`
      );
    } else if (pct >= BUDGET_NEAR_LIMIT_THRESHOLD * 100) {
      recommendations.push(`Estás cerca del límite en "${budget.name}" (${pct.toFixed(0)}%).`);
    }
  }

  if (topCategory && income > 0) {
    const pct = (topCategory.amount / income) * 100;
    if (pct >= TOP_CATEGORY_INCOME_SHARE_ALERT * 100) {
      recommendations.push(
        `"${topCategory.name}" representa el ${pct.toFixed(0)}% de tus ingresos; evalúa si es necesario.`
      );
    }
  }

  const nearGoal = goals
    .filter((g) => g.targetAmount > 0)
    .map((g) => ({
      name: g.name,
      pct: (g.currentAmount / g.targetAmount) * 100,
    }))
    .find((g) => g.pct >= GOAL_NEAR_COMPLETION_THRESHOLD * 100 && g.pct < 100);

  if (nearGoal) {
    recommendations.push(
      `Meta "${nearGoal.name}" está al ${nearGoal.pct.toFixed(0)}%; aprovecha para completarla.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Sigue registrando transacciones para mantener el control financiero."
    );
  }

  return recommendations.slice(0, 4);
}

export async function computeFinancialInsights({
  userId,
  orgId,
  currency,
  scope = "PERSONAL",
}: ComputeInputs): Promise<FinancialInsights> {
  const prisma = getPrisma();
  const now = new Date();
  const currentMonth = getMonthRange(now, 0);
  const previousMonth = getMonthRange(now, -1);

  const [transactions, budgets, goals] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        organizationId: orgId,
        scope,
        date: { gte: previousMonth.start, lte: currentMonth.end },
        OR: [{ userId }, { userId: null }],
      },
      select: { type: true, category: true, amount: true, date: true },
    }),
    prisma.budget.findMany({
      where: { userId },
      select: { name: true, amount: true, spent: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: "ACTIVE" },
      select: { name: true, targetAmount: true, currentAmount: true },
    }),
  ]);

  const mappedTransactions = transactions.map((t) => ({
    type: t.type,
    category: t.category,
    amount: decimalToNumber(t.amount),
    date: t.date,
  }));

  const inMonth = (d: Date) => d >= currentMonth.start && d <= currentMonth.end;
  const inPreviousMonth = (d: Date) => d >= previousMonth.start && d <= previousMonth.end;

  const currentIncome = mappedTransactions
    .filter((t) => t.type === "INCOME" && inMonth(t.date))
    .reduce((sum, t) => sum + t.amount, 0);
  const currentExpense = mappedTransactions
    .filter((t) => t.type === "EXPENSE" && inMonth(t.date))
    .reduce((sum, t) => sum + t.amount, 0);
  const previousIncome = mappedTransactions
    .filter((t) => t.type === "INCOME" && inPreviousMonth(t.date))
    .reduce((sum, t) => sum + t.amount, 0);
  const previousExpense = mappedTransactions
    .filter((t) => t.type === "EXPENSE" && inPreviousMonth(t.date))
    .reduce((sum, t) => sum + t.amount, 0);

  const savingsRate =
    currentIncome > 0 ? ((currentIncome - currentExpense) / currentIncome) * 100 : 0;
  const currentNet = currentIncome - currentExpense;
  const previousNet = previousIncome - previousExpense;
  const trend = determineTrend(currentNet, previousNet);

  const currentExpensesByCategory = mappedTransactions.filter(
    (t) => t.type === "EXPENSE" && inMonth(t.date)
  );
  const topCategory = sumByCategory(currentExpensesByCategory);

  const mappedBudgets = budgets.map((b) => ({
    name: b.name,
    amount: decimalToNumber(b.amount),
    spent: decimalToNumber(b.spent),
  }));
  const mappedGoals = goals.map((g) => ({
    name: g.name,
    targetAmount: decimalToNumber(g.targetAmount),
    currentAmount: decimalToNumber(g.currentAmount),
  }));

  const financialHealth = determineHealth(currentIncome, currentExpense, mappedBudgets);

  const recommendations = buildRecommendations(
    currentIncome,
    currentExpense,
    savingsRate,
    topCategory,
    mappedBudgets,
    mappedGoals,
    currency
  );

  return FinancialInsightsSchema.parse({
    financialHealth,
    topCategory,
    savingsRate: Number(savingsRate.toFixed(1)),
    trend,
    recommendations,
  });
}
