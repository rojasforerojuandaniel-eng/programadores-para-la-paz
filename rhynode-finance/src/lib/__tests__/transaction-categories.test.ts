import { describe, it, expect } from "vitest";
import {
  CATEGORY_KEYS,
  CATEGORY_I18N_KEYS,
  CATEGORY_LABELS_ES,
  COMMON_CATEGORIES,
  normalizeCategoryToKey,
  getCategoryI18nKey,
  isKnownCategory,
} from "@/lib/transaction-categories";

describe("transaction-categories", () => {
  it("has 22 stable keys", () => {
    expect(CATEGORY_KEYS).toHaveLength(22);
    expect(new Set(CATEGORY_KEYS).size).toBe(CATEGORY_KEYS.length);
  });

  it("exposes Spanish labels in COMMON_CATEGORIES for backwards compatibility", () => {
    expect(COMMON_CATEGORIES).toHaveLength(CATEGORY_KEYS.length);
    expect(COMMON_CATEGORIES[0]).toBe("Ventas");
    expect(COMMON_CATEGORIES[COMMON_CATEGORIES.length - 1]).toBe("Otros");
  });

  it("maps every key to a Spanish label", () => {
    for (const key of CATEGORY_KEYS) {
      expect(CATEGORY_LABELS_ES[key]).toBeTruthy();
    }
  });

  it("maps every key to an i18n key under transactionCategories", () => {
    for (const key of CATEGORY_KEYS) {
      expect(CATEGORY_I18N_KEYS[key]).toBe(`transactionCategories.${key}`);
    }
  });

  describe("normalizeCategoryToKey", () => {
    it("returns the same key for valid stable keys", () => {
      expect(normalizeCategoryToKey("sales")).toBe("sales");
      expect(normalizeCategoryToKey("transport_delivery")).toBe("transport_delivery");
    });

    it("maps legacy Spanish labels to stable keys", () => {
      expect(normalizeCategoryToKey("Ventas")).toBe("sales");
      expect(normalizeCategoryToKey("Transporte / Delivery")).toBe("transport_delivery");
      expect(normalizeCategoryToKey("Servicios públicos")).toBe("utilities");
      expect(normalizeCategoryToKey("Transferencia/Finanzas")).toBe("transfer_finance");
    });

    it("is case and accent insensitive", () => {
      expect(normalizeCategoryToKey("ventas")).toBe("sales");
      expect(normalizeCategoryToKey("café")).toBe("coffee");
      expect(normalizeCategoryToKey("transporte / delivery")).toBe("transport_delivery");
    });

    it("falls back to 'other' for unknown values", () => {
      expect(normalizeCategoryToKey("")).toBe("other");
      expect(normalizeCategoryToKey(null)).toBe("other");
      expect(normalizeCategoryToKey("Categoria personalizada")).toBe("other");
    });
  });

  describe("getCategoryI18nKey", () => {
    it("returns the i18n key for known values", () => {
      expect(getCategoryI18nKey("Ventas")).toBe("transactionCategories.sales");
      expect(getCategoryI18nKey("sales")).toBe("transactionCategories.sales");
    });

    it("falls back to transactionCategories.other for unknown values", () => {
      expect(getCategoryI18nKey("Custom")).toBe("transactionCategories.other");
    });
  });

  describe("isKnownCategory", () => {
    it("returns true for known keys and legacy labels", () => {
      expect(isKnownCategory("sales")).toBe(true);
      expect(isKnownCategory("Ventas")).toBe(true);
    });

    it("returns false for unknown or empty values", () => {
      expect(isKnownCategory("")).toBe(false);
      expect(isKnownCategory("Foo")).toBe(false);
    });
  });
});
