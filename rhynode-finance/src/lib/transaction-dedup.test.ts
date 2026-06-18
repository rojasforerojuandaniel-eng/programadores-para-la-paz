import { describe, it, expect } from "vitest";
import { findDuplicates } from "./transaction-dedup";

describe("findDuplicates", () => {
  it("flags exact duplicates within a batch", () => {
    const incoming = [
      { amount: -45000, description: "PSE Rappi", date: "2026-06-17" },
      { amount: -45000, description: "PSE Rappi", date: "2026-06-17" },
    ];
    const matches = findDuplicates(incoming);
    expect(matches).toHaveLength(1);
    expect(matches[0].index).toBe(1);
    expect(matches[0].duplicateOf).toBe(0);
  });

  it("does not flag transactions with different amounts", () => {
    const incoming = [
      { amount: -45000, description: "Rappi", date: "2026-06-17" },
      { amount: -50000, description: "Rappi", date: "2026-06-17" },
    ];
    expect(findDuplicates(incoming)).toHaveLength(0);
  });

  it("flags duplicates against existing DB rows", () => {
    const incoming = [{ amount: -300000, description: "Arriendo Junio", date: "2026-06-05" }];
    const existing = [{ amount: -300000, description: "Arriendo", date: "2026-06-05" }];
    const matches = findDuplicates(incoming, existing);
    expect(matches).toHaveLength(1);
    expect(matches[0].duplicateOf).toBe(1); // points into existing
  });

  it("ignores same amount if dates are far apart", () => {
    const incoming = [
      { amount: -100000, description: "Mercado", date: "2026-01-05" },
      { amount: -100000, description: "Mercado", date: "2026-06-05" },
    ];
    expect(findDuplicates(incoming)).toHaveLength(0);
  });

  it("matches despite bank statement prefixes (PSE*, COMPR*)", () => {
    const incoming = [{ amount: -89000, description: "COMPR* EXITO", date: "2026-06-10" }];
    const existing = [{ amount: -89000, description: "Compra Exito", date: "2026-06-11" }];
    expect(findDuplicates(incoming, existing)).toHaveLength(1);
  });
});