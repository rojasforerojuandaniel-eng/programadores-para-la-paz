import { describe, it, expect } from "vitest";
import { suggestCategory } from "@/lib/categorizer";

describe("suggestCategory", () => {
  it("matches delivery keywords", () => {
    const result = suggestCategory("Pago Rappi", 25000);
    expect(result.category).toBe("transport_delivery");
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("matches entertainment keywords", () => {
    const result = suggestCategory("Spotify premium", 18000);
    expect(result.category).toBe("entertainment");
  });

  it("falls back to amount-based cafe rule", () => {
    const result = suggestCategory("Compra en cafeteria", 3500);
    expect(result.category).toBe("coffee");
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("falls back to generic category", () => {
    const result = suggestCategory("Pago miscelaneo xyz", 500000);
    expect(result.category).toBe("shopping");
  });

  it("normalizes accents and case", () => {
    const result = suggestCategory("NetFlíx", 25000);
    expect(result.category).toBe("entertainment");
  });

  it("returns 'other' for unrecognized descriptions", () => {
    const result = suggestCategory("foo bar baz qux", 100);
    expect(result.category).toBe("other");
  });
});
