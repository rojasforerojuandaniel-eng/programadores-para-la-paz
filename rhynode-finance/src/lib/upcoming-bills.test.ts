import { describe, it, expect } from "vitest";
import { formatDueLabel } from "./upcoming-bills";

describe("formatDueLabel", () => {
  it("labels overdue days", () => {
    expect(formatDueLabel(-1)).toBe("Vencida hace 1d");
    expect(formatDueLabel(-5)).toBe("Vencida hace 5d");
  });

  it("labels today and tomorrow", () => {
    expect(formatDueLabel(0)).toBe("Vence hoy");
    expect(formatDueLabel(1)).toBe("Vence mañana");
  });

  it("labels near-future days", () => {
    expect(formatDueLabel(3)).toBe("En 3 días");
    expect(formatDueLabel(7)).toBe("En 7 días");
  });
});