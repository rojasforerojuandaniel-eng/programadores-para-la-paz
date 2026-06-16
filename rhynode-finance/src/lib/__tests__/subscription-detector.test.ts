import { describe, it, expect } from "vitest";
import { detectSubscriptions } from "@/lib/subscription-detector";
import { Prisma } from "@/generated/prisma/client";

function tx(description: string, amount: number, date: Date) {
  return {
    id: `tx-${description}-${date.toISOString()}`,
    description,
    amount: new Prisma.Decimal(amount),
    date,
    currency: "COP",
    category: "Entretenimiento",
  } as any;
}

describe("detectSubscriptions", () => {
  it("detects monthly netflix subscription", () => {
    const transactions = [
      tx("Netflix", 16900, new Date("2026-01-15")),
      tx("Netflix", 16900, new Date("2026-02-15")),
      tx("Netflix", 16900, new Date("2026-03-15")),
    ];

    const results = detectSubscriptions(transactions);
    expect(results.length).toBe(1);
    expect(results[0].frequency).toBe("MONTHLY");
    expect(results[0].confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("requires at least 2 transactions", () => {
    const transactions = [tx("Netflix", 16900, new Date("2026-01-15"))];
    const results = detectSubscriptions(transactions);
    expect(results.length).toBe(0);
  });

  it("ignores irregular transactions", () => {
    const transactions = [
      tx("Pago variado", 10000, new Date("2026-01-15")),
      tx("Pago variado", 50000, new Date("2026-03-20")),
    ];
    const results = detectSubscriptions(transactions);
    expect(results.length).toBe(0);
  });
});
