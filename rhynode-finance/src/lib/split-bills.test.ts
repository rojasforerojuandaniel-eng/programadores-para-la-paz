import { describe, it, expect } from "vitest";
import { computeBalances, suggestSettlements, type SplitGroup } from "./split-bills";

const group: SplitGroup = {
  id: "g1",
  name: "Piso",
  currency: "COP",
  members: [
    { id: "a", name: "Ana" },
    { id: "b", name: "Bob" },
    { id: "c", name: "Caro" },
  ],
  expenses: [
    { id: "e1", description: "Arriendo", amount: 3_000_000, paidBy: "a" },
    { id: "e2", description: "Mercado", amount: 600_000, paidBy: "b" },
    { id: "e3", description: "Servicios", amount: 300_000, paidBy: "c" },
  ],
};

describe("computeBalances", () => {
  it("splits equally and computes net balances", () => {
    const balances = computeBalances(group);
    const byId = Object.fromEntries(balances.map((b) => [b.memberId, b]));
    // Total spent = 3_900_000; each owes 1_300_000.
    expect(byId.a.net).toBeCloseTo(3_000_000 - 1_300_000, 0); // +1_700_000
    expect(byId.b.net).toBeCloseTo(600_000 - 1_300_000, 0); // -700_000
    expect(byId.c.net).toBeCloseTo(300_000 - 1_300_000, 0); // -1_000_000
  });

  it("respects explicit weight shares", () => {
    const g: SplitGroup = {
      ...group,
      expenses: [
        { id: "e1", description: "Cena", amount: 90_000, paidBy: "a", shares: { a: 1, b: 2 }, shareType: "weight" },
      ],
    };
    const balances = computeBalances(g);
    const byId = Object.fromEntries(balances.map((b) => [b.memberId, b]));
    expect(byId.a.owes).toBeCloseTo(30_000, 0);
    expect(byId.b.owes).toBeCloseTo(60_000, 0);
    expect(byId.c.owes).toBeCloseTo(0, 0);
  });
});

describe("suggestSettlements", () => {
  it("produces minimal settlements that zero out balances", () => {
    const balances = computeBalances(group);
    const settlements = suggestSettlements(balances);
    expect(settlements.length).toBeLessThanOrEqual(2);
    // Apply settlements and verify net balances reach zero.
    const net = new Map(balances.map((b) => [b.memberId, b.net]));
    for (const s of settlements) {
      net.set(s.from, (net.get(s.from) ?? 0) + s.amount);
      net.set(s.to, (net.get(s.to) ?? 0) - s.amount);
    }
    for (const value of net.values()) {
      expect(Math.abs(value)).toBeLessThan(0.01);
    }
  });

  it("returns nothing when everyone is even", () => {
    const even = [
      { memberId: "a", name: "A", paid: 100, owes: 100, net: 0 },
      { memberId: "b", name: "B", paid: 100, owes: 100, net: 0 },
    ];
    expect(suggestSettlements(even)).toEqual([]);
  });
});