import { describe, it, expect } from "vitest";
import { parseTransaction } from "@/lib/voice-parse";

describe("parseTransaction", () => {
  it("parses a digit expense with 'en'", () => {
    expect(parseTransaction("me gasté 20.000 en hamburguesas")).toEqual({
      type: "EXPENSE",
      amount: 20000,
      description: "hamburguesas",
    });
  });

  it("parses a word-number expense", () => {
    const r = parseTransaction("pagué ciento cincuenta mil de arriendo");
    expect(r.type).toBe("EXPENSE");
    expect(r.amount).toBe(150000);
    expect(r.description).toBe("arriendo");
  });

  it("parses income with 'mil' word", () => {
    const r = parseTransaction("recibí veinte mil del sueldo");
    expect(r.type).toBe("INCOME");
    expect(r.amount).toBe(20000);
    expect(r.description).toBe("sueldo");
  });

  it("parses large digit income", () => {
    const r = parseTransaction("me llegó 500.000 por una venta");
    expect(r.type).toBe("INCOME");
    expect(r.amount).toBe(500000);
    expect(r.description).toBe("venta");
  });

  it("handles plain digits without thousands separator", () => {
    const r = parseTransaction("gasté 20000 en café");
    expect(r).toEqual({ type: "EXPENSE", amount: 20000, description: "café".replace("é", "e") });
  });

  it("returns null type when no keyword matches", () => {
    const r = parseTransaction("20000 hamburguesas");
    expect(r.type).toBeNull();
    expect(r.amount).toBe(20000);
  });

  it("returns null amount when no number is spoken", () => {
    const r = parseTransaction("me gasté en hamburguesas");
    expect(r.type).toBe("EXPENSE");
    expect(r.amount).toBeNull();
  });

  it("handles empty input", () => {
    expect(parseTransaction("")).toEqual({ type: null, amount: null, description: "" });
  });

  it("handles 'cien mil'", () => {
    const r = parseTransaction("gasté cien mil en mercado");
    expect(r.amount).toBe(100000);
    expect(r.description).toBe("mercado");
  });
});