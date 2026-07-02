import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { requireAuthFromRequest } from "@/lib/auth-from-request";
import { decimalToNumber } from "@/lib/decimal";
import { calculateHealthScore } from "@/lib/health-score";
import { logger } from "@/lib/logger";

async function computeDashboardSummary(organizationId: string, profileId: string, currency: string) {
  const prisma = getPrisma();

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const [personalAccounts, businessAccounts, transactions, budgets, goals, debts] = await Promise.all([
    prisma.account.findMany({ where: { userId: profileId } }),
    prisma.bankAccount.findMany({ where: { organizationId } }),
    prisma.transaction.findMany({
      where: {
        organizationId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    prisma.budget.findMany({ where: { userId: profileId } }),
    prisma.goal.findMany({ where: { userId: profileId } }),
    prisma.debt.findMany({ where: { userId: profileId } }),
  ]);

  const totalBalance =
    personalAccounts.reduce((sum, a) => sum + decimalToNumber(a.balance), 0) +
    businessAccounts.reduce((sum, a) => sum + decimalToNumber(a.balance), 0);

  const income = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + decimalToNumber(t.amount), 0);

  const expense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + decimalToNumber(t.amount), 0);

  const upcomingItems = [...debts, ...goals]
    .filter((item) => {
      const due = "dueDate" in item && item.dueDate ? item.dueDate : "deadline" in item && item.deadline ? item.deadline : null;
      return due instanceof Date && due >= now;
    })
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      title: "name" in item && typeof item.name === "string" ? item.name : "Goal",
      amount: decimalToNumber("targetAmount" in item ? item.targetAmount : item.remainingAmount),
      dueDate: ("dueDate" in item && item.dueDate ? item.dueDate : "deadline" in item && item.deadline ? item.deadline : null)?.toISOString(),
      type: "dueDate" in item ? "debt" : "goal",
    }));

  const healthScore = calculateHealthScore({
    income,
    expense,
    accounts: personalAccounts.map((a) => ({ balance: decimalToNumber(a.balance), type: a.type })),
    budgets: budgets.map((b) => ({ amount: decimalToNumber(b.amount), spent: decimalToNumber(b.spent) })),
    goals: goals.map((g) => ({ currentAmount: decimalToNumber(g.currentAmount), targetAmount: decimalToNumber(g.targetAmount) })),
    debts: debts.map((d) => ({ principalAmount: decimalToNumber(d.principalAmount), remainingAmount: decimalToNumber(d.remainingAmount) })),
  });

  return {
    totalBalance,
    income,
    expense,
    upcomingItems,
    healthScore: healthScore.overallScore,
    currency,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    if (!auth?.org || !auth.profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { org, profile } = auth;

    const getCachedDashboardSummary = unstable_cache(
      computeDashboardSummary,
      [`dashboard-summary-${org.id}`],
      { revalidate: 60, tags: ["dashboard-summary"] }
    );

    const summary = await getCachedDashboardSummary(org.id, profile.id, org.currency);

    return NextResponse.json(summary, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    logger.error("Dashboard summary error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to load dashboard summary" }, { status: 500 });
  }
}
