import { decimalToNumber } from "@/lib/decimal";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";

const INVESTMENT_TYPES = [
  "INVESTMENT",
  "STOCK",
  "BOND",
  "CRYPTO",
  "ETF",
  "REAL_ESTATE",
  "OTHER",
] as const;

export async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.account.findMany({
      where: {
        userId: profile.id,
        type: { in: INVESTMENT_TYPES as unknown as string[] },
      },
      include: {
        transactions: true,
      },
    });

    let totalInvested = 0;
    let totalCurrent = 0;

    const investments = accounts.map((account) => {
      const currentValue = decimalToNumber(account.balance);
      // Calculate invested from expense transactions on this account (purchases)
      const expenses = account.transactions.filter(
        (t) => t.type === "EXPENSE"
      );
      const invested = expenses.reduce((sum, t) => sum + Math.abs(decimalToNumber(t.amount)), 0);

      const returnValue = invested > 0
        ? ((currentValue - invested) / invested) * 100
        : 0;

      totalInvested += invested;
      totalCurrent += currentValue;

      const metadata =
        typeof account.metadata === "object" && account.metadata !== null
          ? (account.metadata as Record<string, unknown>)
          : {};

      return {
        name: account.name,
        type:
          (metadata.investmentType as string) ||
          account.provider ||
          account.type,
        currentValue,
        invested,
        return: Number(returnValue.toFixed(2)),
      };
    });

    const totalReturn = totalInvested > 0
      ? ((totalCurrent - totalInvested) / totalInvested) * 100
      : 0;

    return NextResponse.json({
      investments,
      totalInvested,
      totalCurrent,
      totalReturn: Number(totalReturn.toFixed(2)),
    });
  } catch (error) {
    console.error("Failed to fetch investment performance:", error);
    return NextResponse.json(
      { error: "Failed to fetch investment performance" },
      { status: 500 }
    );
  }
}
