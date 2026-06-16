import { describe, it, expect } from "vitest";
import { toDecimal, decimalToNumber } from "@/lib/decimal";
import { Prisma } from "@/generated/prisma/client";

describe("decimal helpers", () => {
  it("converts number to Decimal", () => {
    const d = toDecimal(1234.56);
    expect(d).toBeInstanceOf(Prisma.Decimal);
    expect(d.toNumber()).toBe(1234.56);
  });

  it("handles null/undefined as zero", () => {
    expect(toDecimal(null).toNumber()).toBe(0);
    expect(toDecimal(undefined).toNumber()).toBe(0);
  });

  it("converts Decimal to number", () => {
    const d = new Prisma.Decimal(99.99);
    expect(decimalToNumber(d)).toBe(99.99);
  });

  it("handles null decimalToNumber as zero", () => {
    expect(decimalToNumber(null)).toBe(0);
    expect(decimalToNumber(undefined)).toBe(0);
  });
});
