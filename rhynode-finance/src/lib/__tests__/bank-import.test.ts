import { describe, it, expect } from "vitest";
import {
  detectColumnMapping,
  normalizeAmount,
  normalizeDate,
} from "@/lib/bank-import";

describe("bank-import", () => {
  describe("detectColumnMapping", () => {
    it("detects Colombian bank headers", () => {
      const headers = ["Fecha", "Descripción", "Débito", "Crédito", "Saldo"];
      const mapping = detectColumnMapping(headers);
      expect(mapping.date).toBe("Fecha");
      expect(mapping.description).toBe("Descripción");
      expect(mapping.debit).toBe("Débito");
      expect(mapping.credit).toBe("Crédito");
      expect(mapping.balance).toBe("Saldo");
    });

    it("detects signed amount headers", () => {
      const headers = ["fecha", "descripcion", "monto"];
      const mapping = detectColumnMapping(headers);
      expect(mapping.date).toBe("fecha");
      expect(mapping.description).toBe("descripcion");
      expect(mapping.amount).toBe("monto");
    });

    it("prefers exact matches", () => {
      const headers = ["Fecha", "Concepto", "Valor"];
      const mapping = detectColumnMapping(headers);
      expect(mapping.date).toBe("Fecha");
      expect(mapping.description).toBe("Concepto");
      expect(mapping.amount).toBe("Valor");
    });
  });

  describe("normalizeAmount", () => {
    it("parses Colombian format with dot thousands and comma decimal", () => {
      expect(normalizeAmount("1.234,56")).toBe(1234.56);
    });

    it("parses COP currency symbol and spaces", () => {
      expect(normalizeAmount("$ 12.345,67 COP")).toBe(12345.67);
    });

    it("parses negative amounts", () => {
      expect(normalizeAmount("-1.234,56")).toBe(-1234.56);
    });

    it("parses US format", () => {
      expect(normalizeAmount("1,234.56")).toBe(1234.56);
    });

    it("returns null for invalid values", () => {
      expect(normalizeAmount("")).toBeNull();
      expect(normalizeAmount("N/A")).toBeNull();
    });
  });

  describe("normalizeDate", () => {
    it("parses dd/mm/yyyy", () => {
      const date = normalizeDate("15/06/2026");
      expect(date).not.toBeNull();
      expect(date?.toISOString().startsWith("2026-06-15")).toBe(true);
    });

    it("parses yyyy-mm-dd", () => {
      const date = normalizeDate("2026-06-15");
      expect(date).not.toBeNull();
      expect(date?.toISOString().startsWith("2026-06-15")).toBe(true);
    });

    it("parses Excel serial numbers", () => {
      const date = normalizeDate("45117");
      expect(date).not.toBeNull();
      expect(date?.getFullYear()).toBe(2023);
    });

    it("returns null for invalid dates", () => {
      expect(normalizeDate("not a date")).toBeNull();
    });
  });
});
