import { describe, it, expect } from "vitest";
import { planDebtPayoff, formatDebtPlan, type DebtInput } from "./debt-strategy";

const debts: DebtInput[] = [
  { id: "1", name: "Tarjeta", balance: 1_000_000, rate: 0.36, minPayment: 60_000 },
  { id: "2", name: "Préstamo", balance: 500_000, rate: 0.18, minPayment: 30_000 },
  { id: "3", name: "Microcrédito", balance: 200_000, rate: 0.22, minPayment: 20_000 },
];

describe("planDebtPayoff", () => {
  it("avalanche targets the highest-interest debt first", () => {
    const result = planDebtPayoff(debts, 200_000, "avalanche");
    expect(result.steps[0].name).toBe("Tarjeta"); // 36% highest
  });

  it("snowball targets the smallest balance first", () => {
    const result = planDebtPayoff(debts, 200_000, "snowball");
    expect(result.steps[0].name).toBe("Microcrédito"); // 200k smallest
  });

  it("returns zero debt-free when no debts", () => {
    const result = planDebtPayoff([], 100_000, "avalanche");
    expect(result.totalBalance).toBe(0);
    expect(result.debtFreeMonths).toBe(0);
  });

  it("completes payoff within a reasonable horizon", () => {
    const result = planDebtPayoff(debts, 250_000, "avalanche");
    expect(result.debtFreeMonths).toBeGreaterThan(0);
    expect(result.debtFreeMonths).toBeLessThan(120);
    expect(result.totalInterest).toBeGreaterThan(0);
  });

  it("avalanche pays less total interest than snowball (typically)", () => {
    const avalanche = planDebtPayoff(debts, 200_000, "avalanche");
    const snowball = planDebtPayoff(debts, 200_000, "snowball");
    expect(avalanche.totalInterest).toBeLessThanOrEqual(snowball.totalInterest + 1);
  });
});

describe("formatDebtPlan", () => {
  it("renders a human-readable plan", () => {
    const text = formatDebtPlan(planDebtPayoff(debts, 200_000, "avalanche"));
    expect(text).toContain("avalancha");
    expect(text).toContain("Tarjeta");
  });
});