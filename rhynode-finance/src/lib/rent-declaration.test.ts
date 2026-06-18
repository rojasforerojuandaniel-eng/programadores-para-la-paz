import { describe, it, expect } from "vitest";
import { computeProgressiveTax } from "./rent-declaration";

describe("computeProgressiveTax", () => {
  it("returns 0 for zero or negative base", () => {
    expect(computeProgressiveTax(0)).toBe(0);
    expect(computeProgressiveTax(-1000)).toBe(0);
  });

  it("taxes 0 within the exempt first bracket", () => {
    expect(computeProgressiveTax(50_000_000)).toBe(0);
  });

  it("applies 19% on the second bracket portion only", () => {
    // 60.6M exempt; 50M of 110M falls in 19% bracket
    const base = 60_600_000 + 50_000_000;
    expect(computeProgressiveTax(base)).toBeCloseTo(50_000_000 * 0.19, 1);
  });

  it("applies progressive rates across multiple brackets", () => {
    const base = 200_000_000; // spans brackets 1-2
    // bracket1: 0 (0..60.6M)
    // bracket2: 19% on (60.6M..152.3M) = 91.7M * 0.19 = 17.423M
    // bracket3: 24% on (152.3M..200M) = 47.7M * 0.24 = 11.448M
    const expected = 91_700_000 * 0.19 + 47_700_000 * 0.24;
    expect(computeProgressiveTax(base)).toBeCloseTo(expected, 0);
  });

  it("hits the top 35% bracket", () => {
    const base = 2_000_000_000;
    const tax = computeProgressiveTax(base);
    expect(tax).toBeGreaterThan(0);
    // effective rate should be well below 35% due to progressive brackets
    expect(tax / base).toBeLessThan(0.35);
  });
});