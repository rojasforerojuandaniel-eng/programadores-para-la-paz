import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/decimal";
import { logger } from "@/lib/logger";

const TOOL_NAMES = [
  "get_balance",
  "list_transactions",
  "create_reminder",
  "get_cashflow_summary",
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

type ParamsMap = {
  get_balance: z.infer<typeof getBalanceParams>;
  list_transactions: z.infer<typeof listTransactionsParams>;
  create_reminder: z.infer<typeof createReminderParams>;
  get_cashflow_summary: z.infer<typeof getCashflowSummaryParams>;
};

function formatCop(value: number): string {
  return `$${Math.round(value).toLocaleString("es-CO")} COP`;
}

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

  const total = accounts.reduce(
    (sum, account) => sum + decimalToNumber(account.balance),
    0
  );

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
    where: { organizationId: ctx.orgId },
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

  const notification = await prisma.notification.create({
    data: {
      userId: ctx.userId,
      type: "REMINDER",
      title,
      body,
      actionUrl: dueDate ? `/dashboard/advisor?reminder=${dueDate}` : null,
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
      organizationId: ctx.orgId,
      date: { gte: startDate, lte: endDate },
    },
    include: { categoryRef: { select: { name: true } } },
  });

  let income = 0;
  let expense = 0;
  const categoryMap = new Map<string, number>();

  for (const transaction of transactions) {
    const amount = decimalToNumber(transaction.amount);
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

const paramSchemas: { [T in ToolName]: z.ZodType<ParamsMap[T]> } = {
  get_balance: getBalanceParams,
  list_transactions: listTransactionsParams,
  create_reminder: createReminderParams,
  get_cashflow_summary: getCashflowSummaryParams,
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
