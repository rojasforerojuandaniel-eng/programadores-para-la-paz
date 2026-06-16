import { decimalToNumber } from "@/lib/decimal";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { z } from "zod";

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      })
    )
    .max(50)
    .optional(),
});

export const POST = withRateLimit(
  async (request: Request) => {
    const profile = await getUserProfile();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parseResult = chatSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: parseResult.error.flatten() }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { message: userMessage } = parseResult.data;

    const prisma = getPrisma();

    const org = await prisma.organization.findUnique({
      where: { userId: profile.id },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let totalBalance = 0;
    let monthIncome = 0;
    let monthExpense = 0;

    const accounts = await prisma.account.findMany({
      where: { userId: profile.id },
    });
    totalBalance = accounts.reduce((sum, acc) => sum + decimalToNumber(acc.balance), 0);

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
      include: { category: true },
    });
    const budgetsText = budgets
      .map(
        (b) =>
          `- ${b.name}${b.category ? ` (${b.category.name})` : ""}: $${Math.round(decimalToNumber(b.spent)).toLocaleString("es-CO")} / $${Math.round(decimalToNumber(b.amount)).toLocaleString("es-CO")} COP`
      )
      .join("\n") || "Ninguno";

    const goals = await prisma.goal.findMany({
      where: { userId: profile.id, status: "ACTIVE" },
    });
    const goalsText = goals
      .map(
        (g) =>
          `- ${g.name}: $${Math.round(decimalToNumber(g.currentAmount)).toLocaleString("es-CO")} / $${Math.round(decimalToNumber(g.targetAmount)).toLocaleString("es-CO")} COP`
      )
      .join("\n") || "Ninguna";

    const debts = await prisma.debt.findMany({
      where: { userId: profile.id, status: "ACTIVE" },
    });
    const debtsText = debts
      .map(
        (d) =>
          `- ${d.name}${d.counterparty ? ` con ${d.counterparty}` : ""}: $${Math.round(
            decimalToNumber(d.remainingAmount)
          ).toLocaleString("es-CO")} COP restante`
      )
      .join("\n") || "Ninguna";

    const systemPrompt = `Eres Rhynode AI Advisor, un asesor financiero experto para LATAM.\nContexto del usuario:\n- Balance total: $${Math.round(
      totalBalance
    ).toLocaleString("es-CO")} COP\n- Ingresos mes: $${Math.round(monthIncome).toLocaleString("es-CO")} COP\n- Gastos mes: $${Math.round(
      monthExpense
    ).toLocaleString("es-CO")} COP\n- Presupuestos:\n${budgetsText}\n- Metas activas:\n${goalsText}\n- Deudas:\n${debtsText}\n\nResponde en español, sé conciso y práctico. No des consejos genéricos — usa los datos reales del usuario.`;

    const messages = [...(parseResult.data.history ?? []), { role: "user" as const, content: userMessage }];

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return new Response(JSON.stringify({ error: "AI request failed", detail: text }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  },
  { key: "ai-chat", maxRequests: 10, windowMs: 60000 }
);
