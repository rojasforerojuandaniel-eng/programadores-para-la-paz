import { decimalToNumber } from "@/lib/decimal";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { generateBriefing, type BriefingData } from "@/lib/briefing";

interface BriefingCacheEntry {
  text: string;
  expiresAt: number;
}

const briefingCache = new Map<string, BriefingCacheEntry>();

export const GET = withRateLimit(
  async () => {
    const profile = await getUserProfile();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cacheKey = profile.id;
    const cached = briefingCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return new Response(JSON.stringify({ briefing: cached.text }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const prisma = getPrisma();

    const org = await prisma.organization.findUnique({
      where: { userId: profile.id },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const accounts = await prisma.account.findMany({
      where: { userId: profile.id },
    });
    const balance = accounts.reduce((sum, acc) => sum + decimalToNumber(acc.balance), 0);

    let monthIncome = 0;
    let monthExpense = 0;

    if (org) {
      const monthTransactions = await prisma.transaction.findMany({
        where: {
          organizationId: org.id,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
      });
      monthIncome = monthTransactions
        .filter((t) => t.type === "INCOME")
        .reduce((sum, t) => sum + decimalToNumber(t.amount), 0);
      monthExpense = monthTransactions
        .filter((t) => t.type === "EXPENSE")
        .reduce((sum, t) => sum + decimalToNumber(t.amount), 0);
    }

    const budgets = await prisma.budget.findMany({
      where: { userId: profile.id },
    });
    const budgetsExceeded = budgets
      .filter((b) => decimalToNumber(b.spent) > decimalToNumber(b.amount))
      .map((b) => ({ name: b.name, spent: decimalToNumber(b.spent), amount: decimalToNumber(b.amount) }));

    const debts = await prisma.debt.findMany({
      where: { userId: profile.id, status: "ACTIVE" },
      orderBy: { dueDate: "asc" },
      take: 3,
    });
    const upcomingDebts = debts.map((d) => ({
      name: d.name,
      remainingAmount: decimalToNumber(d.remainingAmount),
      dueDate: d.dueDate ? d.dueDate.toISOString().split("T")[0] : null,
    }));

    const goals = await prisma.goal.findMany({
      where: { userId: profile.id, status: "ACTIVE" },
    });
    const goalsProgress = goals.map((g) => ({
      name: g.name,
      currentAmount: decimalToNumber(g.currentAmount),
      targetAmount: decimalToNumber(g.targetAmount),
    }));

    const data: BriefingData = {
      balance,
      monthIncome,
      monthExpense,
      budgetsExceeded,
      upcomingDebts,
      goalsProgress,
    };

    // Deterministic briefing — no LLM call, $0 per request.
    const briefingText = generateBriefing(data).trim();

    briefingCache.set(cacheKey, {
      text: briefingText,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    return new Response(JSON.stringify({ briefing: briefingText, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
  { key: "ai-briefing", maxRequests: 10, windowMs: 60000 }
);
