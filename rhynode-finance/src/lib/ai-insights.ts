import { getPrisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/decimal";
import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/lib/locale";

export type NudgeType = "warning" | "tip" | "positive";

export interface Nudge {
  id: string;
  type: NudgeType;
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  priority: number;
}

interface MonthTransaction {
  id: string;
  type: string;
  category: string | null;
  description: string;
  amount: number;
  date: Date;
}

interface CategoryStats {
  mean: number;
  stdDev: number;
}

function getMonthRange(now = new Date()) {
  return {
    start: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)),
    end: new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)),
  };
}

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = calculateMean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

async function fetchBaseData(userId: string) {
  const prisma = getPrisma();

  const org = await prisma.organization.findUnique({
    where: { userId },
    select: { id: true, currency: true },
  });

  const now = new Date();
  const { start, end } = getMonthRange(now);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const [
    monthTransactions,
    historicalTransactions,
    goals,
    recurring,
    detectedSubscriptions,
  ] = await Promise.all([
    org
      ? prisma.transaction.findMany({
          where: {
            organizationId: org.id,
            date: { gte: start, lte: end },
            OR: [{ userId }, { userId: null }],
          },
          select: {
            id: true,
            type: true,
            category: true,
            description: true,
            amount: true,
            date: true,
          },
        })
      : Promise.resolve([]),
    org
      ? prisma.transaction.findMany({
          where: {
            organizationId: org.id,
            type: "EXPENSE",
            date: { gte: ninetyDaysAgo, lte: end },
            OR: [{ userId }, { userId: null }],
          },
          select: {
            id: true,
            category: true,
            description: true,
            amount: true,
            date: true,
          },
        })
      : Promise.resolve([]),
    prisma.goal.findMany({
      where: { userId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        targetAmount: true,
        currentAmount: true,
        currency: true,
        deadline: true,
        createdAt: true,
      },
    }),
    prisma.recurringTransaction.findMany({
      where: { userId, status: "ACTIVE", type: "EXPENSE" },
      select: {
        id: true,
        name: true,
        amount: true,
        isSubscription: true,
        nextDueDate: true,
        lastGeneratedAt: true,
      },
    }),
    prisma.detectedSubscription.findMany({
      where: { userId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        amount: true,
        currency: true,
        lastPaidAt: true,
      },
    }),
  ]);

  return {
    org,
    now,
    monthTransactions: monthTransactions.map((t) => ({
      id: t.id,
      type: t.type,
      category: t.category,
      description: t.description,
      amount: decimalToNumber(t.amount),
      date: t.date,
    })),
    historicalTransactions: historicalTransactions.map((t) => ({
      id: t.id,
      category: t.category,
      description: t.description,
      amount: decimalToNumber(t.amount),
      date: t.date,
    })),
    goals: goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: decimalToNumber(g.targetAmount),
      currentAmount: decimalToNumber(g.currentAmount),
      currency: g.currency,
      deadline: g.deadline,
      createdAt: g.createdAt,
    })),
    recurring: recurring.map((r) => ({
      id: r.id,
      name: r.name,
      amount: decimalToNumber(r.amount),
      isSubscription: r.isSubscription,
      nextDueDate: r.nextDueDate,
      lastGeneratedAt: r.lastGeneratedAt,
    })),
    detectedSubscriptions: detectedSubscriptions.map((s) => ({
      id: s.id,
      name: s.name,
      amount: decimalToNumber(s.amount),
      currency: s.currency,
      lastPaidAt: s.lastPaidAt,
    })),
  };
}

function detectAnomalousSpending(
  monthTransactions: MonthTransaction[],
  historicalTransactions: { category: string | null; amount: number; date: Date }[],
  currency: string,
  locale: Locale
): Nudge | null {
  const en = locale === "en";
  const expenses = monthTransactions.filter((t) => t.type === "EXPENSE");
  if (expenses.length === 0) return null;

  const statsByCategory = new Map<string, CategoryStats>();
  const categoryAmounts = new Map<string, number[]>();

  for (const t of historicalTransactions) {
    const cat = t.category ?? (en ? "Uncategorized" : "Sin categoría");
    const list = categoryAmounts.get(cat) ?? [];
    list.push(t.amount);
    categoryAmounts.set(cat, list);
  }

  for (const [cat, amounts] of categoryAmounts.entries()) {
    if (amounts.length < 3) continue;
    statsByCategory.set(cat, {
      mean: calculateMean(amounts),
      stdDev: calculateStdDev(amounts),
    });
  }

  const outliers = expenses
    .filter((t) => {
      const cat = t.category ?? (en ? "Uncategorized" : "Sin categoría");
      const stats = statsByCategory.get(cat);
      if (!stats) return false;
      if (stats.stdDev === 0) return false;
      return t.amount > stats.mean + 2 * stats.stdDev;
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 2);

  if (outliers.length === 0) return null;

  const top = outliers[0];
  const total = outliers.reduce((sum, o) => sum + o.amount, 0);
  const topCat = top.category ?? (en ? "Uncategorized" : "Sin categoría");

  return {
    id: `anomalous-spending-${top.id}`,
    type: "warning",
    icon: "alert-triangle",
    title: en ? `Anomalous spending in ${topCat}` : `Gasto anómalo en ${topCat}`,
    description:
      outliers.length === 1
        ? en
          ? `${top.description} for ${formatCurrency(total, currency, locale)} exceeds twice the standard deviation of this category.`
          : `${top.description} por ${formatCurrency(total, currency, locale)} supera el doble de la desviación típica de esta categoría.`
        : en
          ? `${outliers.length} transactions for ${formatCurrency(total, currency, locale)} fall outside the usual pattern for ${topCat}.`
          : `${outliers.length} transacciones por ${formatCurrency(total, currency, locale)} se salen del patrón habitual de ${topCat}.`,
    actionLabel: en ? "Review" : "Revisar",
    actionHref: "/dashboard/transactions",
    priority: 90,
  };
}

function detectAntExpenses(
  monthTransactions: MonthTransaction[],
  income: number,
  currency: string,
  locale: Locale
): Nudge | null {
  if (income <= 0) return null;
  const en = locale === "en";

  const expenses = monthTransactions.filter((t) => t.type === "EXPENSE" && t.amount > 0);
  const threshold = Math.min(20000, income * 0.02);

  const groups = new Map<string, { total: number; count: number; example: string }>();

  for (const t of expenses) {
    if (t.amount >= threshold) continue;
    const key = normalizeText(t.description || t.category || (en ? "Other" : "Otro"));
    if (!key) continue;
    const existing = groups.get(key) ?? { total: 0, count: 0, example: t.description || key };
    existing.total += t.amount;
    existing.count += 1;
    groups.set(key, existing);
  }

  const candidates = Array.from(groups.entries())
    .filter(([, data]) => data.count >= 3)
    .map(([key, data]) => ({ key, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const totalAnt = candidates.reduce((sum, c) => sum + c.total, 0);
  const percentOfIncome = totalAnt / income;

  if (percentOfIncome < 0.05 || candidates.length === 0) return null;

  const top = candidates[0];

  return {
    id: `ant-expenses-${top.key}`,
    type: "warning",
    icon: "bug",
    title: en ? "Accumulated small expenses" : "Gastos hormiga acumulados",
    description: en
      ? `Frequent small purchases (e.g. ${top.example}) add up to ${formatCurrency(
          totalAnt,
          currency,
          locale
        )}, ${(percentOfIncome * 100).toFixed(1)}% of your income this month.`
      : `Pequeños gastos frecuentes (ej. ${top.example}) suman ${formatCurrency(
          totalAnt,
          currency,
          locale
        )}, el ${(percentOfIncome * 100).toFixed(1)}% de tus ingresos este mes.`,
    actionLabel: en ? "Details" : "Detalles",
    actionHref: "/dashboard/personal/categories",
    priority: 80,
  };
}

function detectSubscriptionIssues(
  recurring: {
    id: string;
    name: string;
    amount: number;
    isSubscription: boolean;
    nextDueDate: Date;
    lastGeneratedAt: Date | null;
  }[],
  detectedSubscriptions: { id: string; name: string; amount: number; lastPaidAt: Date | null }[],
  historicalTransactions: { description: string; amount: number; date: Date }[],
  currency: string,
  now: Date,
  locale: Locale
): Nudge | null {
  const en = locale === "en";
  const allSubscriptionNames = new Set<string>();
  recurring.forEach((r) => allSubscriptionNames.add(normalizeText(r.name)));
  detectedSubscriptions.forEach((s) => allSubscriptionNames.add(normalizeText(s.name)));

  if (allSubscriptionNames.size === 0) return null;

  const unusedDetected = detectedSubscriptions
    .filter((s) => {
      if (!s.lastPaidAt) return true;
      return daysBetween(s.lastPaidAt, now) > 45;
    })
    .sort((a, b) => b.amount - a.amount)[0];

  if (unusedDetected) {
    return {
      id: `subscription-unused-${unusedDetected.id}`,
      type: "tip",
      icon: "credit-card",
      title: en ? `Still using ${unusedDetected.name}?` : `¿Sigues usando ${unusedDetected.name}?`,
      description: en
        ? `We haven't recorded payments in the last 45 days. Check if it's worth ${formatCurrency(
            unusedDetected.amount,
            currency,
            locale
          )} per month.`
        : `No registramos pagos en los últimos 45 días. Revisa si vale ${formatCurrency(
            unusedDetected.amount,
            currency,
            locale
          )} mensuales.`,
      actionLabel: en ? "Audit" : "Auditar",
      actionHref: "/dashboard/personal/subscriptions",
      priority: 70,
    };
  }

  const recentTxByName = new Map<string, number[]>();
  for (const t of historicalTransactions) {
    const normalized = normalizeText(t.description);
    for (const name of allSubscriptionNames) {
      if (normalized.includes(name) || name.includes(normalized)) {
        const list = recentTxByName.get(name) ?? [];
        list.push(t.amount);
        recentTxByName.set(name, list);
      }
    }
  }

  for (const sub of detectedSubscriptions) {
    const key = normalizeText(sub.name);
    const amounts = recentTxByName.get(key) ?? [];
    if (amounts.length < 2) continue;
    const avg = calculateMean(amounts);
    if (avg > 0 && sub.amount > avg * 1.2) {
      return {
        id: `subscription-price-${sub.id}`,
        type: "warning",
        icon: "trending-up",
        title: en ? `${sub.name} raised its price` : `${sub.name} subió de precio`,
        description: en
          ? `It went from an average of ${formatCurrency(avg, currency, locale)} to ${formatCurrency(
              sub.amount,
              currency,
              locale
            )}. Check if you still need it.`
          : `Pasó de un promedio de ${formatCurrency(avg, currency, locale)} a ${formatCurrency(
              sub.amount,
              currency,
              locale
            )}. Revisa si aún lo necesitas.`,
        actionLabel: en ? "Review" : "Revisar",
        actionHref: "/dashboard/personal/subscriptions",
        priority: 85,
      };
    }
  }

  for (const rec of recurring.filter((r) => r.isSubscription)) {
    const key = normalizeText(rec.name);
    const amounts = recentTxByName.get(key) ?? [];
    if (amounts.length < 2) continue;
    const avg = calculateMean(amounts);
    if (avg > 0 && rec.amount > avg * 1.2) {
      return {
        id: `recurring-price-${rec.id}`,
        type: "warning",
        icon: "trending-up",
        title: en ? `${rec.name} raised its price` : `${rec.name} subió de precio`,
        description: en
          ? `The recurring amount went from an average of ${formatCurrency(
              avg,
              currency,
              locale
            )} to ${formatCurrency(rec.amount, currency, locale)}.`
          : `El monto recurrente pasó de un promedio de ${formatCurrency(
              avg,
              currency,
              locale
            )} a ${formatCurrency(rec.amount, currency, locale)}.`,
        actionLabel: en ? "Review" : "Revisar",
        actionHref: "/dashboard/personal/recurring",
        priority: 85,
      };
    }
  }

  return null;
}

function detectLaggingGoal(
  goals: {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    currency: string;
    deadline: Date | null;
    createdAt: Date;
  }[],
  currency: string,
  now: Date,
  locale: Locale
): Nudge | null {
  const en = locale === "en";
  const lagging = goals
    .filter((g) => g.deadline && g.targetAmount > 0)
    .map((g) => {
      const start = g.createdAt.getTime();
      const end = g.deadline!.getTime();
      const elapsed = now.getTime() - start;
      const total = end - start;
      const elapsedRatio = total > 0 ? elapsed / total : 0;
      const expected = g.targetAmount * Math.min(1, Math.max(0, elapsedRatio));
      const progressRatio = g.currentAmount / g.targetAmount;
      const expectedRatio = expected / g.targetAmount;
      return { ...g, progressRatio, expectedRatio, gap: expectedRatio - progressRatio };
    })
    .filter((g) => g.expectedRatio > 0.1 && g.gap > 0.2)
    .sort((a, b) => b.gap - a.gap)[0];

  if (!lagging) return null;

  return {
    id: `lagging-goal-${lagging.id}`,
    type: "warning",
    icon: "target",
    title: en ? `Lagging goal: ${lagging.name}` : `Meta rezagada: ${lagging.name}`,
    description: en
      ? `You're at ${(lagging.progressRatio * 100).toFixed(0)}% of the target and should be around ${(
          lagging.expectedRatio * 100
        ).toFixed(0)}% by now.`
      : `Llevas ${(lagging.progressRatio * 100).toFixed(0)}% del objetivo y ya deberías tener alrededor del ${(
          lagging.expectedRatio * 100
        ).toFixed(0)}%.`,
    actionLabel: en ? "Boost contribution" : "Aumentar aporte",
    actionHref: "/dashboard/personal/goals",
    priority: 75,
  };
}

function detectSavingsOpportunity(
  income: number,
  expense: number,
  goals: { id: string; name: string; targetAmount: number; currentAmount: number }[],
  currency: string,
  locale: Locale
): Nudge | null {
  if (income <= 0) return null;
  const en = locale === "en";
  const savingsRate = (income - expense) / income;

  if (savingsRate < 0.1) return null;

  const surplus = income - expense;
  const laggingGoal = goals
    .filter((g) => g.targetAmount > 0)
    .sort((a, b) => b.targetAmount - b.currentAmount - (a.targetAmount - a.currentAmount))[0];

  return {
    id: "savings-opportunity",
    type: "positive",
    icon: "piggy-bank",
    title: en ? "Savings opportunity" : "Oportunidad de ahorro",
    description: en
      ? `This month you have ${formatCurrency(
          surplus,
          currency,
          locale
        )} free (${(savingsRate * 100).toFixed(0)}% of income). ${
          laggingGoal
            ? `You could accelerate ${laggingGoal.name}.`
            : "Ideal to create or boost a savings goal."
        }`
      : `Este mes tienes ${formatCurrency(
          surplus,
          currency,
          locale
        )} libres (${(savingsRate * 100).toFixed(0)}% de ingresos). ${
          laggingGoal
            ? `Podrías acelerar ${laggingGoal.name}.`
            : "Ideal para crear o impulsar una meta de ahorro."
        }`,
    actionLabel: en ? "View goals" : "Ver metas",
    actionHref: "/dashboard/personal/goals",
    priority: 60,
  };
}

export async function generatePersonalInsights(
  userId: string,
  currency: string,
  locale: Locale = "es"
): Promise<Nudge[]> {
  const { org, now, monthTransactions, historicalTransactions, goals, recurring, detectedSubscriptions } =
    await fetchBaseData(userId);

  const income = monthTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = monthTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

  const nudges: Nudge[] = [];

  if (!org) {
    const savingsOpportunity = detectSavingsOpportunity(income, expense, goals, currency, locale);
    if (savingsOpportunity) nudges.push(savingsOpportunity);
    const laggingGoal = detectLaggingGoal(goals, currency, now, locale);
    if (laggingGoal) nudges.push(laggingGoal);
    return nudges.sort((a, b) => b.priority - a.priority).slice(0, 3);
  }

  const anomalous = detectAnomalousSpending(monthTransactions, historicalTransactions, currency, locale);
  if (anomalous) nudges.push(anomalous);

  const ant = detectAntExpenses(monthTransactions, income, currency, locale);
  if (ant) nudges.push(ant);

  const subscription = detectSubscriptionIssues(
    recurring,
    detectedSubscriptions,
    historicalTransactions,
    currency,
    now,
    locale
  );
  if (subscription) nudges.push(subscription);

  const laggingGoal = detectLaggingGoal(goals, currency, now, locale);
  if (laggingGoal) nudges.push(laggingGoal);

  const savings = detectSavingsOpportunity(income, expense, goals, currency, locale);
  if (savings) nudges.push(savings);

  return nudges.sort((a, b) => b.priority - a.priority).slice(0, 3);
}
