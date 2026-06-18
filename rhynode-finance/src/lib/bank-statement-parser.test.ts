import { describe, it, expect } from "vitest";
import { parseStatement } from "./bank-statement-parser";

describe("parseStatement", () => {
  it("parses a Bancolombia-style CSV with a single Valor column", () => {
    const csv = "Fecha,Descripcion,Valor\n17/06/2026,PSE Rappi,-45000\n18/06/2026,Nomina,3000000";
    const result = parseStatement(csv, "auto");
    expect(result.bank).toBe("bancolombia");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ amount: -45000, currency: "COP" });
    expect(result.rows[0].date).toBe("2026-06-17");
    expect(result.rows[1].amount).toBe(3_000_000);
  });

  it("parses Davivienda with separate debit/credit columns", () => {
    const csv = "Fecha,Descripcion,Debito,Credito\n01/06/2026,Compra Exito,150000,\n02/06/2026,Transferencia, ,200000";
    const result = parseStatement(csv, "davivienda");
    expect(result.rows[0].amount).toBe(-150000);
    expect(result.rows[1].amount).toBe(200000);
  });

  it("handles Colombian thousand separators (1.234.567,89)", () => {
    const csv = "Fecha,Descripcion,Valor\n17/06/2026,Nomina,\"1.234.567,89\"";
    const result = parseStatement(csv, "auto");
    expect(result.rows[0].amount).toBeCloseTo(1_234_567.89, 1);
  });

  it("skips rows with unparseable dates", () => {
    const csv = "Fecha,Descripcion,Valor\nnotadate,X,100\n17/06/2026,Valid,200";
    const result = parseStatement(csv, "auto");
    expect(result.rows).toHaveLength(1);
    expect(result.skipped).toBe(1);
  });

  it("returns empty rows for an empty input", () => {
    expect(parseStatement("", "auto")).toEqual({ bank: "auto", rows: [], skipped: 0 });
  });

  it("parses Nequi yyyy-mm-dd dates", () => {
    const csv = "Fecha,Descripcion,Valor\n2026-06-17,Recarga,20000";
    const result = parseStatement(csv, "auto");
    expect(result.rows[0].date).toBe("2026-06-17");
    expect(result.rows[0].amount).toBe(20000);
  });
});