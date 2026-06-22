import type { ToolName } from "@/lib/ai-tools";
import type { Locale } from "@/lib/locale";

/**
 * Deterministic fast-path for /api/ai/chat.
 *
 * Most advisor queries are predictable ("¿cuánto tengo?", "¿qué gasté?",
 * "¿cómo va mi flujo de caja?") and map 1:1 to an existing tool. Resolving them
 * directly avoids an LLM round-trip entirely — $0 and lower latency.
 *
 * Intentionally scoped to read-only tools. `create_reminder` (a write action
 * with free-form args) stays on the LLM so the model parses the request.
 */

export interface DetectedIntent {
  tool: ToolName;
  input: Record<string, unknown>;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

const has = (text: string, ...needles: string[]): boolean =>
  needles.some((needle) => text.includes(needle));

export function detectIntent(rawMessage: string): DetectedIntent | null {
  const text = normalize(rawMessage);

  // get_balance — balance total / cuánto dinero tengo / how much do I have
  if (
    has(
      text,
      "cuanto tengo",
      "cuanto dinero",
      "cual es mi balance",
      "mi balance",
      "saldo total",
      "mi saldo",
      "cuanto saldo",
      "how much do i have",
      "how much money",
      "what is my balance",
      "my balance",
      "total balance",
      "my funds"
    ) ||
    /^(balance|saldo|funds?)\b/.test(text)
  ) {
    return { tool: "get_balance", input: {} };
  }

  // get_cashflow_summary — flujo de caja / cashflow
  const cashflowMonthsMatch = text.match(/(\d+)\s*(meses|mes|months?|month)\b/);
  if (
    has(
      text,
      "flujo de caja",
      "flujo",
      "cuanto entro y salio",
      "entro y salio",
      "resumen de mis gastos",
      "resumen de gastos",
      "como van mis finanzas",
      "resumen financiero",
      "cash flow",
      "cashflow",
      "income and expenses",
      "money in and out",
      "in and out",
      "spending summary",
      "how are my finances",
      "financial summary"
    ) ||
    /\b(cash ?flow|cashflow)\b/.test(text)
  ) {
    const months = cashflowMonthsMatch ? Number(cashflowMonthsMatch[1]) : undefined;
    return {
      tool: "get_cashflow_summary",
      input: months ? { months } : {},
    };
  }

  // list_transactions — qué gasté / últimas transacciones / gastos en X
  const categoryMatch = text.match(
    /(?:gast(?:e|ado)|gastos|transacciones?|spent|spending|expenses?|transactions?)\s+(?:en|de|sobre|on|for|in)\s+([a-záéíóúñ\s]+)/
  );
  if (
    has(
      text,
      "ultimas transacciones",
      "mis transacciones",
      "que gast",
      "que compre",
      "mis gastos",
      "mis movimientos",
      "historial",
      "last transactions",
      "my transactions",
      "what did i spend",
      "what did i buy",
      "my expenses",
      "my spending",
      "my movements",
      "history"
    ) ||
    /^(transacciones|gastos|transactions|expenses)\b/.test(text) ||
    categoryMatch
  ) {
    const input: Record<string, unknown> = {};
    if (categoryMatch) {
      input.category = categoryMatch[1].trim();
    }
    const limitMatch = text.match(
      /(\d+)\s*(ultimas|transacciones|gastos|movimientos|last|transactions|expenses|movements)/
    );
    if (limitMatch) {
      input.limit = Number(limitMatch[1]);
    }
    if (
      has(text, "ingreso", "entradas", "income", "incoming") &&
      !has(text, "gast", "egreso", "salidas", "spend", "expense")
    ) {
      input.type = "INCOME";
    } else if (has(text, "gast", "egreso", "salidas", "spend", "expense", "outgoing")) {
      input.type = "EXPENSE";
    }
    return { tool: "list_transactions", input };
  }

  // debt_payoff_strategy — how to pay off debts (avalanche/snowball).
  const budgetMatch = text.match(/(\d{4,})\s*(?:al\s*mes|por\s*mes|mensual|\/mes|per\s*month|monthly|\/month)?/);
  if (
    has(
      text,
      "como pago mis deudas",
      "estrategia de deudas",
      "pago de deudas",
      "librarme de deudas",
      "salir de deudas",
      "plan de deudas",
      "avalancha",
      "bola de nieve",
      "snowball",
      "how do i pay off my debts",
      "debt strategy",
      "debt payoff",
      "get out of debt",
      "debt plan",
      "avalanche"
    ) ||
    (/\b(debts?|deudas?)\b/.test(text) &&
      has(text, "pago", "plan", "estrategia", "libre", "como", "pay", "plan", "strategy", "free", "how"))
  ) {
    return {
      tool: "debt_payoff_strategy",
      input: {
        strategy: has(text, "bola de nieve", "snowball") ? "snowball" : "avalanche",
        ...(budgetMatch ? { monthlyBudget: Number(budgetMatch[1]) } : {}),
      },
    };
  }

  return null;
}

function isErrorResult(result: unknown): result is { error: string } {
  return typeof result === "object" && result !== null && "error" in result;
}

function formatBalance(result: Record<string, unknown>, locale: Locale): string {
  const total = result.totalFormatted as string | undefined;
  const accounts = (result.accounts as Array<Record<string, unknown>> | undefined) ?? [];
  const lines = accounts
    .slice(0, 4)
    .map((acc) => `• ${acc.name}: ${acc.balanceFormatted}`)
    .join("\n");
  const header = total
    ? locale === "en"
      ? `Your total balance is ${total}.`
      : `Tu balance total es ${total}.`
    : locale === "en"
      ? "Here's your balance per account:"
      : "Este es tu balance por cuenta:";
  const breakdownLabel = locale === "en" ? "Breakdown" : "Desglose";
  const breakdown = accounts.length > 0 ? `\n\n${breakdownLabel}:\n${lines}` : "";
  return `${header}${breakdown}`;
}

function formatTransactions(result: Record<string, unknown>, locale: Locale): string {
  const count = result.count as number | undefined;
  const transactions = (result.transactions as Array<Record<string, unknown>> | undefined) ?? [];
  if (transactions.length === 0) {
    return locale === "en"
      ? "I couldn't find transactions with those filters."
      : "No encontré transacciones con esos filtros.";
  }
  const lines = transactions
    .slice(0, 10)
    .map((t) => {
      const sign = t.type === "INCOME" ? "+" : "−";
      const cat = t.category ? ` (${t.category})` : "";
      return `• ${sign}${t.amountFormatted}${cat} — ${t.description}`;
    })
    .join("\n");
  const label =
    count && count > 10
      ? locale === "en"
        ? `${count} found, showing the last 10:`
        : `${count} encontradas, te muestro las últimas 10:`
      : locale === "en"
        ? "Here are your latest transactions:"
        : "Estas son tus últimas transacciones:";
  return `${label}\n${lines}`;
}

function formatCashflow(result: Record<string, unknown>, locale: Locale): string {
  const period = result.period as string | undefined;
  const income = result.incomeFormatted as string | undefined;
  const expense = result.expenseFormatted as string | undefined;
  const net = result.netFormatted as string | undefined;
  const top = (result.topExpenseCategories as Array<Record<string, unknown>> | undefined) ?? [];
  const topText =
    top.length > 0
      ? locale === "en"
        ? `\n\nYour top expenses: ${top
            .slice(0, 3)
            .map((c) => `${c.name} (${c.amountFormatted})`)
            .join(", ")}.`
        : `\n\nTus mayores gastos: ${top
            .slice(0, 3)
            .map((c) => `${c.name} (${c.amountFormatted})`)
            .join(", ")}.`
      : "";
  const header =
    locale === "en"
      ? `Summary for ${period ?? "the period"}:`
      : `Resumen de ${period ?? "el período"}:`;
  const incomeLabel = locale === "en" ? "Income" : "Ingresos";
  const expenseLabel = locale === "en" ? "Expenses" : "Gastos";
  const netLabel = locale === "en" ? "Net" : "Neto";
  return `${header}\n• ${incomeLabel}: ${income}\n• ${expenseLabel}: ${expense}\n• ${netLabel}: ${net}${topText}`;
}

/**
 * Turns a tool result into a natural reply for the chat UI in the active locale.
 * Returns null if the result is an error (caller should fall back to the LLM).
 */
export function formatIntentReply(
  tool: ToolName,
  result: unknown,
  locale: Locale = "es"
): string | null {
  if (isErrorResult(result) || typeof result !== "object" || result === null) {
    return null;
  }
  const data = result as Record<string, unknown>;
  switch (tool) {
    case "get_balance":
      return formatBalance(data, locale);
    case "list_transactions":
      return formatTransactions(data, locale);
    case "get_cashflow_summary":
      return formatCashflow(data, locale);
    case "debt_payoff_strategy":
      return (data.recommendation as string) ?? (data.message as string) ?? null;
    default:
      return null;
  }
}