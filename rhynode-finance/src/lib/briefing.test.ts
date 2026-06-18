import { describe, it, expect } from "vitest";
import { generateBriefing, type BriefingData } from "./briefing";

const base: BriefingData = {
  balance: 0,
  monthIncome: 0,
  monthExpense: 0,
  budgetsExceeded: [],
  upcomingDebts: [],
  goalsProgress: [],
};

const now = new Date(2026, 5, 10); // mid-month

describe("generateBriefing", () => {
  it("flags overspend pace when spending outpaces month progress", () => {
    const text = generateBriefing(
      {
        ...base,
        balance: 1_000_000,
        monthIncome: 3_000_000,
        monthExpense: 2_900_000, // ~97% spent by mid-month
      },
      now
    );
    expect(text).toMatch(/gastando más rápido|frena/i);
    expect(text).toContain("$1.000.000 COP");
  });

  it("surplus message when income exceeds expense and no budgets exceeded", () => {
    const text = generateBriefing(
      {
        ...base,
        balance: 2_000_000,
        monthIncome: 4_000_000,
        monthExpense: 1_500_000,
      },
      now
    );
    expect(text).toMatch(/superávit/i);
  });

  it("mentions exceeded budget as the urgent signal", () => {
    const text = generateBriefing(
      {
        ...base,
        balance: 500_000,
        monthIncome: 2_000_000,
        monthExpense: 1_800_000,
        budgetsExceeded: [{ name: "Comida", spent: 600_000, amount: 400_000 }],
      },
      now
    );
    expect(text).toContain("Comida");
    expect(text).toMatch(/pasaste|exced/i);
  });

  it("mentions upcoming debt when no budgets exceeded", () => {
    const text = generateBriefing(
      {
        ...base,
        balance: 1_000_000,
        monthIncome: 2_000_000,
        monthExpense: 1_000_000,
        upcomingDebts: [{ name: "Sura", remainingAmount: 250_000, dueDate: "2026-06-20" }],
      },
      now
    );
    expect(text).toContain("Sura");
    expect(text).toMatch(/vence|obligación/i);
  });

  it("shows goal progress when nothing urgent", () => {
    const text = generateBriefing(
      {
        ...base,
        balance: 1_000_000,
        monthIncome: 2_000_000,
        monthExpense: 1_000_000,
        goalsProgress: [{ name: "Vacaciones", currentAmount: 680_000, targetAmount: 1_000_000 }],
      },
      now
    );
    expect(text).toContain("Vacaciones");
    expect(text).toMatch(/68%/);
  });

  it("always returns a non-empty string", () => {
    const text = generateBriefing(base, now);
    expect(text.length).toBeGreaterThan(20);
  });
});