import { describe, it, expect } from "vitest";
import { deriveCopRates, SUPPORTED_FX_CURRENCIES } from "@/lib/fx-rates";
import { convertToCop, sumInCop, type TrmResult } from "@/lib/currency";

describe("deriveCopRates", () => {
  it("derives currency→COP from USD rates via cross-rate", () => {
    // 1 USD = 0.92 EUR, 1 USD = 4000 COP → 1 EUR = 4000/0.92 ≈ 4347.83 COP
    const usdRates = { USD: 1, EUR: 0.92, COP: 4000, MXN: 18, BRL: 5 };
    const cop = deriveCopRates(usdRates);
    expect(cop.EUR).toBeCloseTo(4000 / 0.92, 5);
    expect(cop.MXN).toBeCloseTo(4000 / 18, 5);
    expect(cop.BRL).toBeCloseTo(4000 / 5, 5);
  });

  it("returns empty when USD→COP is missing", () => {
    expect(deriveCopRates({ USD: 1, EUR: 0.9 })).toEqual({});
  });

  it("returns empty when USD→COP is non-positive", () => {
    expect(deriveCopRates({ USD: 1, COP: 0 })).toEqual({});
    expect(deriveCopRates({ USD: 1, COP: -1 })).toEqual({});
  });

  it("skips a supported currency if its USD rate is missing", () => {
    const cop = deriveCopRates({ USD: 1, COP: 4000, EUR: 0.9 });
    expect(cop.EUR).toBeDefined();
    // MXN absent in input → not present in output
    expect(cop.MXN).toBeUndefined();
  });

  it("only emits supported currencies", () => {
    const cop = deriveCopRates({ USD: 1, COP: 4000, JPY: 150, EUR: 0.9 });
    expect(Object.keys(cop).sort()).toEqual(
      [...SUPPORTED_FX_CURRENCIES].filter((c) => c === "EUR").sort()
    );
  });
});

describe("convertToCop with stored rates", () => {
  const trm: TrmResult = { value: 4000, asOf: "2026-06-18" };

  it("converts a non-USD currency using the provided rates map", async () => {
    const rates = { EUR: 4347.83, MXN: 222.22 };
    const r = await convertToCop(100, "EUR", trm, rates);
    expect(r.converted).toBe(true);
    expect(r.cop).toBeCloseTo(100 * 4347.83, 2);
  });

  it("returns unconverted when the currency has no stored rate", async () => {
    const r = await convertToCop(100, "JPY", trm, { EUR: 4347 });
    expect(r.converted).toBe(false);
    expect(r.cop).toBe(100);
  });

  it("still uses TRM for USD even when rates map lacks USD", async () => {
    const r = await convertToCop(10, "USD", trm, {});
    expect(r.converted).toBe(true);
    expect(r.cop).toBe(40_000);
  });
});

describe("sumInCop with mixed currencies", () => {
  const trm: TrmResult = { value: 4000, asOf: "2026-06-18" };
  const rates = { EUR: 4347.83, MXN: 222.22 };

  it("sums COP + USD + EUR + an unstored currency", async () => {
    const { totalCop, unconvertedByCurrency } = await sumInCop(
      [
        { amount: 1_000_000, currency: "COP" },
        { amount: 100, currency: "USD" }, // 400_000
        { amount: 100, currency: "EUR" }, // 434_783
        { amount: 50, currency: "JPY" }, // unconverted
      ],
      trm,
      rates
    );
    expect(totalCop).toBeCloseTo(1_000_000 + 400_000 + 434_783, 0);
    expect(unconvertedByCurrency).toEqual({ JPY: 50 });
  });
});