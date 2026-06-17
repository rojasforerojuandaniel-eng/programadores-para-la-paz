import { describe, it, expect } from "vitest";
import {
  calculateHealthScore,
  calculateSavingsScore,
  calculateDebtScore,
  calculateLiquidityScore,
  calculateBudgetScore,
  calculateDiversificationScore,
  getGrade,
} from "@/lib/health-score";
function d(value: number): number {
  return value;
}

describe("calculateSavingsScore", () => {
  it("returns 100 when there is no income and no expense", () => {
    expect(calculateSavingsScore(0, 0)).toBe(100);
  });

  it("returns 0 when there is expense but no income", () => {
    expect(calculateSavingsScore(0, 100)).toBe(0);
  });

  it("caps at 100 for high savings rate", () => {
    expect(calculateSavingsScore(1000, 100)).toBe(100);
  });

  it("scores 50% savings rate as 100", () => {
    expect(calculateSavingsScore(1000, 500)).toBe(100);
  });

  it("scores 20% savings rate as 40", () => {
    expect(calculateSavingsScore(1000, 800)).toBe(40);
  });
});

describe("calculateDebtScore", () => {
  it("returns 100 when there are no debts", () => {
    expect(calculateDebtScore(5000, [])).toBe(100);
  });

  it("weighs amortization progress and debt-to-income", () => {
    const debts = [{ principalAmount: d(10000), remainingAmount: d(5000) }];
    // 50% amortizado => 50, deuda/ingreso 5000/10000 = 0.5 => 50. ponderado 60/40 = 50.
    expect(calculateDebtScore(10000, debts)).toBe(50);
  });

  it("returns 100 when debt is fully paid", () => {
    const debts = [{ principalAmount: d(10000), remainingAmount: d(0) }];
    expect(calculateDebtScore(10000, debts)).toBe(100);
  });
});

describe("calculateLiquidityScore", () => {
  it("returns 100 when balance is high relative to expenses", () => {
    expect(calculateLiquidityScore(12000, 2000)).toBe(100);
  });

  it("scores one month of expenses around 17", () => {
    expect(calculateLiquidityScore(2000, 2000)).toBe(17);
  });

  it("handles zero expenses", () => {
    expect(calculateLiquidityScore(1000, 0)).toBe(100);
    expect(calculateLiquidityScore(0, 0)).toBe(50);
  });
});

describe("calculateBudgetScore", () => {
  it("returns 100 when there are no budgets", () => {
    expect(calculateBudgetScore([])).toBe(100);
  });

  it("returns 100 when spending equals budget", () => {
    expect(calculateBudgetScore([{ amount: d(1000), spent: d(1000) }])).toBe(100);
  });

  it("drops to 50 when spending is 150% of budget", () => {
    expect(calculateBudgetScore([{ amount: d(1000), spent: d(1500) }])).toBe(50);
  });

  it("drops to 0 when spending is 200% of budget", () => {
    expect(calculateBudgetScore([{ amount: d(1000), spent: d(2000) }])).toBe(0);
  });
});

describe("calculateDiversificationScore", () => {
  it("returns 50 when there are no accounts or investments", () => {
    expect(calculateDiversificationScore([], [])).toBe(50);
  });

  it("uses account count as fallback", () => {
    expect(calculateDiversificationScore([{ balance: d(100) }, { balance: d(200) }], [])).toBe(50);
  });

  it("rewards diverse investment types", () => {
    const investments = [
      { investmentType: "STOCKS", balance: d(1000), investedAmount: d(1000) },
      { investmentType: "BONDS", balance: d(1000), investedAmount: d(1000) },
      { investmentType: "CRYPTO", balance: d(1000), investedAmount: d(1000) },
    ];
    const score = calculateDiversificationScore([], investments);
    expect(score).toBeGreaterThan(80);
  });

  it("penalizes concentrated investments", () => {
    const investments = [
      { investmentType: "STOCKS", balance: d(3000), investedAmount: d(3000) },
    ];
    expect(calculateDiversificationScore([], investments)).toBeLessThan(30);
  });
});

describe("calculateHealthScore", () => {
  it("calculates a balanced result", () => {
    const result = calculateHealthScore({
      income: d(10000),
      expense: d(6000),
      debts: [{ principalAmount: d(10000), remainingAmount: d(4000) }],
      budgets: [{ amount: d(2000), spent: d(1800) }],
      accounts: [{ balance: d(12000), type: "CHECKING" }],
      investments: [
        { investmentType: "STOCKS", balance: d(5000), investedAmount: d(5000) },
        { investmentType: "BONDS", balance: d(5000), investedAmount: d(5000) },
      ],
    });

    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.factors).toHaveLength(5);
    expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
  });

  it("returns all-clear recommendation when all factors are strong", () => {
    const result = calculateHealthScore({
      income: d(20000),
      expense: d(6000),
      debts: [{ principalAmount: d(10000), remainingAmount: d(0) }],
      budgets: [{ amount: d(2000), spent: d(1500) }],
      accounts: [{ balance: d(50000), type: "CHECKING" }],
      investments: [
        { investmentType: "STOCKS", balance: d(5000), investedAmount: d(5000) },
        { investmentType: "BONDS", balance: d(5000), investedAmount: d(5000) },
        { investmentType: "CRYPTO", balance: d(5000), investedAmount: d(5000) },
        { investmentType: "REAL_ESTATE", balance: d(5000), investedAmount: d(5000) },
      ],
    });

    expect(result.recommendations[0].factorId).toBe("overall");
  });
});

describe("getGrade", () => {
  it.each([
    [95, "A"],
    [85, "B"],
    [75, "C"],
    [65, "D"],
    [55, "F"],
  ])("score %i gets grade %s", (score, grade) => {
    expect(getGrade(score)).toBe(grade);
  });
});
