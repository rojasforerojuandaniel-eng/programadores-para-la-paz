import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { decimalToNumber } from "@/lib/decimal";
import { logger } from "@/lib/logger";

function getMonthRange() {
  const now = new Date();
  return {
    start: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)),
    end: new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)),
  };
}

export async function GET() {
  let profile: Awaited<ReturnType<typeof getUserProfile>> | null = null;

  try {
    profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    return NextResponse.json({
      currentBalance,
      monthlyIncome,
      monthlyExpenses,
      monthlySavings,
      currency: accounts[0]?.currency ?? "COP",
    });
  } catch (error) {
    logger.error("Failed to fetch scenario summary", { error: error instanceof Error ? error.message : String(error),
      userId: profile?.id,
    });
    return NextResponse.json(
      { error: "Failed to fetch scenario summary" },
      { status: 500 }
    );
  }
}
