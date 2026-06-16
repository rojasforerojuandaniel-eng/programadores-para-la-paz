import { decimalToNumber, toDecimal } from "@/lib/decimal";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  date: z.string().datetime().or(z.string()).optional(),
});

export async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snapshots = await prisma.netWorthSnapshot.findMany({
      where: { userId: profile.id },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error("Failed to fetch net worth snapshots:", error);
    return NextResponse.json(
      { error: "Failed to fetch net worth snapshots" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { date } = parsed.data;

    const accounts = await prisma.account.findMany({
      where: { userId: profile.id },
    });

    const debts = await prisma.debt.findMany({
      where: { userId: profile.id },
    });

    const totalAssets = accounts.reduce((sum, a) => sum + decimalToNumber(a.balance), 0);
    const totalLiabilities = debts.reduce(
      (sum, d) => sum + decimalToNumber(d.remainingAmount),
      0
    );
    const netWorth = totalAssets - totalLiabilities;

    const cashAccounts = accounts.filter(
      (a) =>
        a.type === "CHECKING" || a.type === "SAVINGS" || a.type === "CASH"
    );
    const investmentAccounts = accounts.filter(
      (a) =>
        a.type === "INVESTMENT" ||
        a.type === "STOCK" ||
        a.type === "BOND" ||
        a.type === "CRYPTO" ||
        a.type === "ETF" ||
        a.type === "REAL_ESTATE" ||
        a.type === "OTHER"
    );
    const otherAccounts = accounts.filter(
      (a) =>
        !cashAccounts.includes(a) && !investmentAccounts.includes(a)
    );

    const breakdown = {
      cash: cashAccounts.reduce((sum, a) => sum + decimalToNumber(a.balance), 0),
      investments: investmentAccounts.reduce((sum, a) => sum + decimalToNumber(a.balance), 0),
      other: otherAccounts.reduce((sum, a) => sum + decimalToNumber(a.balance), 0),
      liabilities: totalLiabilities,
    };

    const snapshot = await prisma.netWorthSnapshot.create({
      data: {
        userId: profile.id,
        totalAssets: toDecimal(totalAssets),
        totalLiabilities: toDecimal(totalLiabilities),
        netWorth: toDecimal(netWorth),
        currency: "COP",
        date: date ? new Date(date) : new Date(),
        breakdown,
      },
    });

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Failed to create net worth snapshot:", error);
    return NextResponse.json(
      { error: "Failed to create net worth snapshot" },
      { status: 500 }
    );
  }
}
