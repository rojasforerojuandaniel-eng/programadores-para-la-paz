import { describe, it, expect } from "vitest";
import { suggestCategory } from "@/lib/categorizer";

describe("suggestCategory", () => {
  it("matches delivery keywords", () => {
    const result = suggestCategory("Pago Rappi", 25000);
    expect(result.category).toBe("Transporte / Delivery");
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("matches entertainment keywords", () => {
    const result = suggestCategory("Spotify premium", 18000);
    expect(result.category).toBe("Entretenimiento");
  });

  it("falls back to amount-based cafe rule", () => {
    const result = suggestCategory("Compra en cafeteria", 3500);
    expect(result.category).toBe("Café");
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("falls back to generic category", () => {
    const result = suggestCategory("Pago miscelaneo xyz", 500000);
    expect(result.category).toBe("Compras");
  });

  it("normalizes accents and case", () => {
    const result = suggestCategory("NetFlíx", 25000);
    expect(result.category).toBe("Entretenimiento");
  });
});
