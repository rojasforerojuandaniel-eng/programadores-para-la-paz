import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { decimalToNumber } from "@/lib/decimal";
import { ScenariosClient } from "@/components/dashboard/scenarios/scenarios-client";
import type { Scenario, ScenarioSummary } from "@/lib/scenarios";

function getMonthRange() {
  const now = new Date();
  return {
    start: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)),
    end: new Date(
      Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    ),
  };
}

function getScenariosFromProfile(metadata: unknown): Scenario[] {
  const container = (metadata ?? {}) as { scenarios?: unknown[] };
  const raw = container.scenarios;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is Scenario =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Scenario).id === "string" &&
      typeof (item as Scenario).name === "string"
  );
}

export default async function ScenariosPage() {
  const profile = await getUserProfile();
  if (!profile) {
    redirect("/sign-in");
  }

  const { start, end } = getMonthRange();

  const [accounts, incomeAgg, expenseAgg] = await Promise.all([
    prisma.account.findMany({
      where: { userId: profile.id },
      select: { balance: true, currency: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId: profile.id,
        type: "INCOME",
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId: profile.id,
        type: "EXPENSE",
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
  ]);

  const currentBalance = accounts.reduce(
    (sum, account) => sum + decimalToNumber(account.balance),
    0
  );
  const monthlyIncome = decimalToNumber(incomeAgg._sum?.amount ?? 0);
  const monthlyExpenses = decimalToNumber(expenseAgg._sum?.amount ?? 0);
  const monthlySavings = Math.max(0, monthlyIncome - monthlyExpenses);

  const summary: ScenarioSummary = {
    currentBalance,
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    currency: accounts[0]?.currency ?? "COP",
  };

  const scenarios = getScenariosFromProfile(profile.metadata);

  return (
    <ScenariosClient initialSummary={summary} initialScenarios={scenarios} />
  );
}
