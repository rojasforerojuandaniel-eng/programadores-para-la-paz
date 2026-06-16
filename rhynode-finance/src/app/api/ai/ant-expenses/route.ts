import { decimalToNumber } from "@/lib/decimal";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";

interface AntPattern {
  name: string;
  total: number;
  count: number;
  percentOfTotal: number;
}

interface AntExpensesResponse {
  patterns: AntPattern[];
  totalAnt: number;
  percentOfTotal: number;
}

const PATTERNS = [
  { key: "tintos", name: "Tintos", categories: ["Café / Tinto", "Cafe", "Café", "Tinto"] },
  { key: "rappi", name: "Rappi/Delivery", categories: ["Rappi / Delivery", "Rappi", "Delivery", "Domicilio"] },
  { key: "transporte", name: "Transporte", categories: ["Transporte", "Transporte público", "Uber", "Taxi", "Didi"] },
  { key: "suscripciones", name: "Suscripciones", categories: ["Suscripciones", "Subscription", "Subscripciones", "Membresía", "Membresia"] },
  { key: "almuerzos", name: "Almuerzos", categories: ["Alimentación", "Comida", "Restaurante", "Almuerzo", "Desayuno", "Cena"] },
  { key: "impulsos", name: "Impulsos", categories: ["Gastos hormiga", "Impulsos", "Compras impulsivas", "Misceláneo", "Miscelaneo"] },
];

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
      const empty: AntExpensesResponse = {
        patterns: PATTERNS.map((p) => ({ name: p.name, total: 0, count: 0, percentOfTotal: 0 })),
        totalAnt: 0,
        percentOfTotal: 0,
      };
      return new Response(JSON.stringify(empty), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthTransactions = await prisma.transaction.findMany({
      where: {
        organizationId: org.id,
        type: "EXPENSE",
        date: { gte: startOfMonth, lte: endOfMonth },
        OR: [{ userId: profile.id }, { userId: null }],
      },
      select: {
        category: true,
        amount: true,
        description: true,
      },
    });

    const totalExpense = monthTransactions.reduce((sum, t) => sum + decimalToNumber(t.amount), 0);

    const patterns: AntPattern[] = PATTERNS.map((pattern) => {
      const matched = monthTransactions.filter((t) => {
        const cat = t.category ?? "";
        const desc = t.description ?? "";
        return (
          pattern.categories.some((c) => cat.toLowerCase().includes(c.toLowerCase())) ||
          pattern.categories.some((c) => desc.toLowerCase().includes(c.toLowerCase()))
        );
      });

      const total = matched.reduce((sum, t) => sum + decimalToNumber(t.amount), 0);
      const count = matched.length;
      const percentOfTotal = totalExpense > 0 ? parseFloat(((total / totalExpense) * 100).toFixed(1)) : 0;

      return {
        name: pattern.name,
        total: Math.round(total),
        count,
        percentOfTotal,
      };
    });

    const totalAnt = patterns.reduce((sum, p) => sum + p.total, 0);
    const percentOfTotal = totalExpense > 0 ? parseFloat(((totalAnt / totalExpense) * 100).toFixed(1)) : 0;

    const result: AntExpensesResponse = {
      patterns,
      totalAnt: Math.round(totalAnt),
      percentOfTotal,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
  { key: "ai-ant-expenses", maxRequests: 20, windowMs: 60000 }
);
