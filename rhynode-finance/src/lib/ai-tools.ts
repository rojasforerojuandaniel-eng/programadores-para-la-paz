import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/decimal";
import { logger } from "@/lib/logger";
import { sumInCop, convertToCop, getTrm } from "@/lib/currency";
import { encodeReminderMeta } from "@/lib/reminders";
import { planDebtPayoff, formatDebtPlan, type PayoffStrategy } from "@/lib/debt-strategy";
import { projectGoal, formatGoalProjection } from "@/lib/goal-projection";

const TOOL_NAMES = [
  "get_balance",
  "list_transactions",
  "create_reminder",
  "get_cashflow_summary",
  "debt_payoff_strategy",
  "goal_projection",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export interface ToolContext {
  userId: string;
  orgId: string;
}

interface AnthropicJsonSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
}

export interface AnthropicTool {
  name: ToolName;
  description: string;
  input_schema: AnthropicJsonSchema;
}

const getBalanceParams = z.object({});

const listTransactionsParams = z.object({
  limit: z.number().int().min(1).max(50).optional().default(10),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  category: z.string().optional(),
});

const createReminderParams = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  dueDate: z.string().optional(),
});

const getCashflowSummaryParams = z.object({
  months: z.number().int().min(1).max(12).optional().default(1),
});

const debtPayoffStrategyParams = z.object({
  strategy: z.enum(["avalanche", "snowball"]).optional().default("avalanche"),
  monthlyBudget: z.number().min(0).optional(),
});

const goalProjectionParams = z.object({
  goalId: z.string().min(1),
  monthlyContribution: z.number().min(0).optional(),
});

type ParamsMap = {
  get_balance: z.infer<typeof getBalanceParams>;
  list_transactions: z.infer<typeof listTransactionsParams>;
  create_reminder: z.infer<typeof createReminderParams>;
  get_cashflow_summary: z.infer<typeof getCashflowSummaryParams>;
  debt_payoff_strategy: z.infer<typeof debtPayoffStrategyParams>;
  goal_projection: z.infer<typeof goalProjectionParams>;
};

function formatCop(value: number): string {
  return `$${Math.round(value).toLocaleString("es-CO")} COP`;
}

/** Scope filter so an org member's advisor only sees business txns + their own
 *  personal txns, never other members' personal transactions. */
const orgScopeWhere = (orgId: string, userId: string) => ({
  organizationId: orgId,
  OR: [{ scope: "BUSINESS" }, { userId }, { userId: null }],
});

async function handleGetBalance(ctx: ToolContext) {
  const prisma = getPrisma();
  const accounts = await prisma.account.findMany({
    where: { userId: ctx.userId },
    orderBy: { balance: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      balance: true,
      currency: true,
    },
  });

  const total = (
    await sumInCop(
      accounts.map((a) => ({ amount: decimalToNumber(a.balance), currency: a.currency }))
    )
  ).totalCop;

  return {
    total,
    totalFormatted: formatCop(total),
    currency: "COP",
    accounts: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: decimalToNumber(account.balance),
      balanceFormatted: formatCop(decimalToNumber(account.balance)),
      currency: account.currency,
    })),
  };
}

async function handleListTransactions(
  ctx: ToolContext,
  params: z.infer<typeof listTransactionsParams>
) {
  const prisma = getPrisma();
  const { limit, type, category } = listTransactionsParams.parse(params);

  const transactions = await prisma.transaction.findMany({
    where: orgScopeWhere(ctx.orgId, ctx.userId),
    orderBy: { date: "desc" },
    take: limit,
    include: { categoryRef: { select: { name: true } } },
  });

  const filtered = transactions.filter((transaction) => {
    if (type && transaction.type !== type) return false;
    if (category) {
      const transactionCategory =
        transaction.categoryRef?.name ?? transaction.category ?? "";
      return transactionCategory.toLowerCase().includes(category.toLowerCase());
    }
    return true;
  });

  return {
    count: filtered.length,
    transactions: filtered.map((transaction) => ({
      id: transaction.id,
      description: transaction.description,
      amount: decimalToNumber(transaction.amount),
      amountFormatted: formatCop(decimalToNumber(transaction.amount)),
      type: transaction.type,
      category: transaction.categoryRef?.name ?? transaction.category ?? null,
      currency: transaction.currency,
      date: transaction.date.toISOString(),
    })),
  };
}

async function handleCreateReminder(
  ctx: ToolContext,
  params: z.infer<typeof createReminderParams>
) {
  const prisma = getPrisma();
  const { title, body, dueDate } = createReminderParams.parse(params);

  const actionUrl = dueDate
    ? encodeReminderMeta({
        scheduledAt: dueDate,
        repeat: "NONE",
        active: true,
      })
    : null;

  const notification = await prisma.notification.create({
    data: {
      userId: ctx.userId,
      type: "REMINDER",
      title,
      body,
      actionUrl,
    },
    select: {
      id: true,
      title: true,
      body: true,
      createdAt: true,
    },
  });

  return {
    success: true,
    reminderId: notification.id,
    title: notification.title,
    body: notification.body,
    createdAt: notification.createdAt.toISOString(),
  };
}

async function handleGetCashflowSummary(
  ctx: ToolContext,
  params: z.infer<typeof getCashflowSummaryParams>
) {
  const prisma = getPrisma();
  const { months } = getCashflowSummaryParams.parse(params);

  const now = new Date();
  const startDate = new Date(
    now.getFullYear(),
    now.getMonth() - months + 1,
    1
  );
  const endDate = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const transactions = await prisma.transaction.findMany({
    where: {
      ...orgScopeWhere(ctx.orgId, ctx.userId),
      date: { gte: startDate, lte: endDate },
    },
    include: { categoryRef: { select: { name: true } } },
  });

  const trm = await getTrm();
  let income = 0;
  let expense = 0;
  const categoryMap = new Map<string, number>();

  for (const transaction of transactions) {
    const amount = (
      await convertToCop(decimalToNumber(transaction.amount), transaction.currency, trm)
    ).cop;
    if (transaction.type === "INCOME") {
      income += amount;
    } else if (transaction.type === "EXPENSE") {
      expense += amount;
      const key = transaction.categoryRef?.name ?? transaction.category ?? "Sin categoría";
      categoryMap.set(key, (categoryMap.get(key) ?? 0) + amount);
    }
  }

  const topExpenseCategories = Array.from(categoryMap.entries())
    .map(([name, amount]) => ({ name, amount, amountFormatted: formatCop(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    period: months === 1 ? "mes actual" : `últimos ${months} meses`,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    income,
    incomeFormatted: formatCop(income),
    expense,
    expenseFormatted: formatCop(expense),
    net: income - expense,
    netFormatted: formatCop(income - expense),
    topExpenseCategories,
  };
}

async function handleDebtPayoffStrategy(
  ctx: ToolContext,
  params: z.infer<typeof debtPayoffStrategyParams>
) {
  const prisma = getPrisma();
  const debts = await prisma.debt.findMany({
    where: { userId: ctx.userId, status: "ACTIVE" },
    select: { id: true, name: true, remainingAmount: true, interestRate: true, type: true },
  });
  if (debts.length === 0) {
    return { message: "No tienes deudas activas registradas.", plan: null };
  }
  // Estimate minimum payment as ~5% of balance when not stored, and rate defaults per debt type.
  const inputs = debts.map((d) => {
    const balance = decimalToNumber(d.remainingAmount);
    const rate = d.interestRate ?? (d.type === "TAX" ? 0.22 : 0.0);
    return {
      id: d.id,
      name: d.name,
      balance,
      rate,
      minPayment: Math.max(10_000, Math.round(balance * 0.05)),
    };
  });
  const budget = params.monthlyBudget ?? inputs.reduce((s, d) => s + d.minPayment, 0) + 50_000;
  const result = planDebtPayoff(inputs, budget, params.strategy as PayoffStrategy);
  return {
    budget,
    plan: result,
    recommendation: formatDebtPlan(result),
  };
}

async function handleGoalProjection(
  ctx: ToolContext,
  params: z.infer<typeof goalProjectionParams>
) {
  const prisma = getPrisma();
  const goal = await prisma.goal.findFirst({
    where: { id: params.goalId, userId: ctx.userId },
    select: { id: true, name: true, currentAmount: true, targetAmount: true, deadline: true },
  });
  if (!goal) {
    return { error: "No encontré una meta con ese ID." };
  }
  const result = projectGoal({
    name: goal.name,
    target: decimalToNumber(goal.targetAmount),
    current: decimalToNumber(goal.currentAmount),
    monthlyContribution: params.monthlyContribution,
    deadline: goal.deadline ? goal.deadline.toISOString() : undefined,
  });
  return { goalId: goal.id, projection: result, summary: formatGoalProjection(result) };
}

const paramSchemas: { [T in ToolName]: z.ZodType<ParamsMap[T]> } = {
  get_balance: getBalanceParams,
  list_transactions: listTransactionsParams,
  create_reminder: createReminderParams,
  get_cashflow_summary: getCashflowSummaryParams,
  debt_payoff_strategy: debtPayoffStrategyParams,
  goal_projection: goalProjectionParams,
};

export const anthropicTools: AnthropicTool[] = [
  {
    name: "get_balance",
    description:
      "Obtiene el balance total del usuario y el desglose por cuenta. Devuelve montos en COP.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_transactions",
    description:
      "Devuelve las últimas transacciones del usuario, opcionalmente filtradas por tipo (INCOME/EXPENSE) o categoría.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Número máximo de transacciones (1-50). Por defecto 10.",
        },
        type: {
          type: "string",
          enum: ["INCOME", "EXPENSE"],
          description: "Filtrar por tipo de transacción.",
        },
        category: {
          type: "string",
          description: "Filtrar por nombre de categoría (búsqueda parcial, insensible a mayúsculas).",
        },
      },
    },
  },
  {
    name: "create_reminder",
    description:
      "Crea un recordatorio para el usuario. Lo guarda como una notificación interna.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Título breve del recordatorio.",
        },
        body: {
          type: "string",
          description: "Detalle del recordatorio.",
        },
        dueDate: {
          type: "string",
          description: "Fecha límite opcional en formato ISO (YYYY-MM-DD).",
        },
      },
      required: ["title", "body"],
    },
  },
  {
    name: "get_cashflow_summary",
    description:
      "Devuelve un resumen de ingresos y gastos del usuario para el mes actual o los últimos N meses.",
    input_schema: {
      type: "object",
      properties: {
        months: {
          type: "integer",
          description: "Cantidad de meses hacia atrás (1-12). Por defecto 1.",
        },
      },
    },
  },
  {
    name: "debt_payoff_strategy",
    description:
      "Plan de pago de deudas: avalancha (mayor interés primero, minimiza intereses) o bola de nieve (menor saldo primero). Devuelve el plan ordenado y el resumen legible.",
    input_schema: {
      type: "object",
      properties: {
        strategy: {
          type: "string",
          enum: ["avalanche", "snowball"],
          description: "Estrategia. Por defecto avalanche.",
        },
        monthlyBudget: {
          type: "number",
          description: "Presupuesto mensual total para pagar deudas (COP). Opcional.",
        },
      },
    },
  },
  {
    name: "goal_projection",
    description:
      "Proyecta una meta de ahorro: si tiene deadline calcula el aporte mensual necesario; si recibe monthlyContribution proyecta la fecha de cumplimiento.",
    input_schema: {
      type: "object",
      properties: {
        goalId: {
          type: "string",
          description: "ID de la meta a proyectar.",
        },
        monthlyContribution: {
          type: "number",
          description: "Aporte mensual actual (COP) para proyectar fecha de cumplimiento.",
        },
      },
      required: ["goalId"],
    },
  },
];

export function isToolName(name: string): name is ToolName {
  return TOOL_NAMES.includes(name as ToolName);
}

export async function executeTool(
  name: string,
  input: unknown,
  ctx: ToolContext
): Promise<unknown> {
  if (!isToolName(name)) {
    return { error: `Tool desconocida: ${name}` };
  }

  const schema = paramSchemas[name];
  const parsed = schema.safeParse(input ?? {});
  if (!parsed.success) {
    return {
      error: "Parámetros inválidos",
      details: parsed.error.flatten(),
    };
  }

  try {
    switch (name) {
      case "get_balance":
        return await handleGetBalance(ctx);
      case "list_transactions":
        return await handleListTransactions(
          ctx,
          parsed.data as ParamsMap["list_transactions"]
        );
      case "create_reminder":
        return await handleCreateReminder(
          ctx,
          parsed.data as ParamsMap["create_reminder"]
        );
      case "get_cashflow_summary":
        return await handleGetCashflowSummary(
          ctx,
          parsed.data as ParamsMap["get_cashflow_summary"]
        );
      case "debt_payoff_strategy":
        return await handleDebtPayoffStrategy(
          ctx,
          parsed.data as ParamsMap["debt_payoff_strategy"]
        );
      case "goal_projection":
        return await handleGoalProjection(
          ctx,
          parsed.data as ParamsMap["goal_projection"]
        );
    }
  } catch (error) {
    logger.error("AI tool execution failed", {
      tool: name,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      error: `No pude ejecutar la herramienta ${name}. Inténtalo de nuevo.`,
    };
  }
}
