import { describe, it, expect } from "vitest";
import { projectGoal, formatGoalProjection } from "./goal-projection";

describe("projectGoal", () => {
  it("marks already-completed goals", () => {
    const r = projectGoal({ name: "Vacaciones", target: 1_000_000, current: 1_000_000 });
    expect(r.alreadyDone).toBe(true);
    expect(r.progressPct).toBe(100);
  });

  it("computes required monthly contribution for a deadline", () => {
    const deadline = new Date();
    deadline.setMonth(deadline.getMonth() + 10);
    const r = projectGoal({
      name: "Carro",
      target: 20_000_000,
      current: 4_000_000,
      deadline: deadline.toISOString(),
    });
    expect(r.requiredMonthly).toBeGreaterThan(0);
    expect(r.requiredMonthly).toBeCloseTo(16_000_000 / 10, -3);
  });

  it("projects completion months from a monthly contribution", () => {
    const r = projectGoal({
      name: "Casa",
      target: 12_000_000,
      current: 2_000_000,
      monthlyContribution: 1_000_000,
    });
    expect(r.projectedMonths).toBeGreaterThan(0);
    expect(r.projectedMonths).toBeLessThanOrEqual(10);
    expect(r.projectedCompletionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("computes progress percentage", () => {
    const r = projectGoal({ name: "X", target: 100, current: 25 });
    expect(r.progressPct).toBe(25);
    expect(r.remaining).toBe(75);
  });
});

describe("formatGoalProjection", () => {
  it("renders completion message for done goals", () => {
    const text = formatGoalProjection(projectGoal({ name: "X", target: 100, current: 100 }));
    expect(text).toMatch(/completada/i);
  });
});