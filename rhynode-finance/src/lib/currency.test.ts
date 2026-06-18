import { describe, it, expect, vi, beforeEach } from "vitest";
import { convertToCop, sumInCop, FALLBACK_TRM, type TrmResult } from "./currency";

describe("convertToCop", () => {
  beforeEach(() => vi.unstubAllEnvs());

  it("passes COP through unchanged", async () => {
    expect(await convertToCop(1000, "COP")).toEqual({ cop: 1000, converted: false });
  });

  it("converts USD using provided TRM", async () => {
    const trm: TrmResult = { value: 3900, asOf: "2026-06-18" };
    expect(await convertToCop(100, "USD", trm)).toEqual({ cop: 390_000, converted: true });
  });

  it("uses fallback TRM when none provided and fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    const result = await convertToCop(100, "USD");
    expect(result.cop).toBe(100 * FALLBACK_TRM);
    expect(result.converted).toBe(true);
  });

  it("returns unconverted for unknown currencies", async () => {
    const trm: TrmResult = { value: 3900, asOf: "2026-06-18" };
    expect(await convertToCop(100, "EUR", trm)).toEqual({ cop: 100, converted: false });
  });
});

describe("sumInCop", () => {
  it("sums mixed COP and USD with provided TRM", async () => {
    const trm: TrmResult = { value: 4000, asOf: "2026-06-18" };
    const { totalCop, unconvertedByCurrency } = await sumInCop(
      [
        { amount: 1_000_000, currency: "COP" },
        { amount: 100, currency: "USD" }, // 400_000
        { amount: 50, currency: "EUR" }, // unconverted
      ],
      trm
    );
    expect(totalCop).toBe(1_400_000);
    expect(unconvertedByCurrency).toEqual({ EUR: 50 });
  });
});