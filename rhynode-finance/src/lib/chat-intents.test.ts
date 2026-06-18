import { describe, it, expect } from "vitest";
import { detectIntent, formatIntentReply } from "./chat-intents";

describe("detectIntent", () => {
  it("detects balance queries", () => {
    expect(detectIntent("¿Cuánto dinero tengo?")).toEqual({ tool: "get_balance", input: {} });
    expect(detectIntent("¿Cuál es mi balance?")).toEqual({ tool: "get_balance", input: {} });
    expect(detectIntent("mi saldo total")).toEqual({ tool: "get_balance", input: {} });
  });

  it("detects cashflow with month count", () => {
    const intent = detectIntent("¿Cómo va mi flujo de caja los últimos 3 meses?");
    expect(intent?.tool).toBe("get_cashflow_summary");
    expect(intent?.input).toEqual({ months: 3 });
  });

  it("detects cashflow without month count", () => {
    const intent = detectIntent("¿Cuánto entró y salió?");
    expect(intent).toEqual({ tool: "get_cashflow_summary", input: {} });
  });

  it("detects transactions with category filter", () => {
    const intent = detectIntent("¿Qué gasté en comida?");
    expect(intent?.tool).toBe("list_transactions");
    expect(intent?.input.category).toBe("comida");
  });

  it("detects transactions with limit", () => {
    const intent = detectIntent("muéstrame las 5 últimas transacciones");
    expect(intent?.tool).toBe("list_transactions");
    expect(intent?.input.limit).toBe(5);
  });

  it("returns null for open-ended questions that need the LLM", () => {
    expect(detectIntent("¿Cómo ajusto mi presupuesto para ahorrar para un carro en 8 meses?")).toBeNull();
    expect(detectIntent("recuérdame pagar la renta el viernes")).toBeNull();
    expect(detectIntent("¿me conviene invertir en cripto?")).toBeNull();
  });
});

describe("formatIntentReply", () => {
  it("formats balance result", () => {
    const reply = formatIntentReply("get_balance", {
      total: 1000000,
      totalFormatted: "$1.000.000 COP",
      currency: "COP",
      accounts: [
        { id: "1", name: "Cuenta Ahorros", type: "SAVINGS", balance: 1000000, balanceFormatted: "$1.000.000 COP", currency: "COP" },
      ],
    });
    expect(reply).toContain("$1.000.000 COP");
    expect(reply).toContain("Cuenta Ahorros");
  });

  it("formats transactions result", () => {
    const reply = formatIntentReply("list_transactions", {
      count: 2,
      transactions: [
        { id: "1", description: "Rappi", amount: 50000, amountFormatted: "$50.000 COP", type: "EXPENSE", category: "Transporte", date: "2026-06-17" },
      ],
    });
    expect(reply).toContain("Rappi");
    expect(reply).toContain("$50.000 COP");
  });

  it("handles empty transactions", () => {
    const reply = formatIntentReply("list_transactions", { count: 0, transactions: [] });
    expect(reply).toMatch(/no encontr/i);
  });

  it("formats cashflow result", () => {
    const reply = formatIntentReply("get_cashflow_summary", {
      period: "mes actual",
      incomeFormatted: "$4.000.000 COP",
      expenseFormatted: "$1.500.000 COP",
      netFormatted: "$2.500.000 COP",
      topExpenseCategories: [{ name: "Comida", amount: 600000, amountFormatted: "$600.000 COP" }],
    });
    expect(reply).toContain("$4.000.000 COP");
    expect(reply).toContain("Comida");
  });

  it("returns null on error results (fall back to LLM)", () => {
    expect(formatIntentReply("get_balance", { error: "fallo" })).toBeNull();
  });
});