import { decimalToNumber } from "@/lib/decimal";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { getLocale } from "@/lib/locale-server";

interface Anomaly {
  category: string;
  currentMonth: number;
  average: number;
  increasePercent: number;
  severity: "high" | "medium";
}

export const GET = withRateLimit(
  async () => {
    const profile = await getUserProfile();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const prisma = getPrisma();

    const org = await prisma.organization.findUnique({
      where: { userId: profile.id },
    });

    if (!org) {
      return new Response(JSON.stringify({ anomalies: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const locale = await getLocale();
    const isEn = locale === "en";
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const prevMonth1Start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth1End = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const prevMonth2Start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const prevMonth2End = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        organizationId: org.id,
        type: "EXPENSE",
        date: { gte: prevMonth2Start, lte: currentMonthEnd },
        OR: [{ userId: profile.id }, { userId: null }],
      },
      select: {
        category: true,
        amount: true,
        date: true,
      },
    });

    const currentMonthTx = transactions.filter(
      (t) => t.date >= currentMonthStart && t.date <= currentMonthEnd
    );
    const prevMonth1Tx = transactions.filter(
      (t) => t.date >= prevMonth1Start && t.date <= prevMonth1End
    );
    const prevMonth2Tx = transactions.filter(
      (t) => t.date >= prevMonth2Start && t.date <= prevMonth2End
    );

    const sumByCategory = (txs: typeof transactions) => {
      const map = new Map<string, number>();
      for (const t of txs) {
        const cat = t.category ?? (isEn ? "Uncategorized" : "Sin categoría");
        map.set(cat, (map.get(cat) ?? 0) + decimalToNumber(t.amount));
      }
      return map;
    };

    const currentMap = sumByCategory(currentMonthTx);
    const prev1Map = sumByCategory(prevMonth1Tx);
    const prev2Map = sumByCategory(prevMonth2Tx);

    const anomalies: Anomaly[] = [];

    for (const [category, currentAmount] of currentMap.entries()) {
      const prev1 = prev1Map.get(category) ?? 0;
      const prev2 = prev2Map.get(category) ?? 0;
      const average = prev1 + prev2 > 0 ? (prev1 + prev2) / 2 : 0;

      if (average > 0 && currentAmount > average * 1.5) {
        const increasePercent = Math.round(((currentAmount - average) / average) * 100);
        const severity: "high" | "medium" = increasePercent > 100 ? "high" : "medium";
        anomalies.push({
          category,
          currentMonth: Math.round(currentAmount),
          average: Math.round(average),
          increasePercent,
          severity,
        });
      }
    }

    anomalies.sort((a, b) => b.increasePercent - a.increasePercent);

    return new Response(JSON.stringify({ anomalies }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
  { key: "ai-anomalies", maxRequests: 20, windowMs: 60000 }
);
