/**
 * Shared transaction category definitions.
 *
 * This MUST live in a plain module (no "use client") so Server Components can
 * import the runtime value. Importing it from a "use client" module into a
 * Server Component yields an undefined client-reference proxy at render time.
 */

/** Stable category keys stored in the database. */
export const CATEGORY_KEYS = [
  "sales",
  "payroll",
  "services",
  "materials",
  "marketing",
  "transport_delivery",
  "entertainment",
  "coffee",
  "groceries",
  "restaurant",
  "transport",
  "telecommunications",
  "utilities",
  "insurance",
  "health",
  "education",
  "transfer_finance",
  "clothing",
  "travel",
  "pets",
  "shopping",
  "other",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

/** i18n namespace for category labels. */
const I18N_NAMESPACE = "transactionCategories" as const;

/** Map from stable key to full i18n key under `transactionCategories.*`. */
export const CATEGORY_I18N_KEYS: Record<CategoryKey, `${typeof I18N_NAMESPACE}.${CategoryKey}`> =
  Object.fromEntries(
    CATEGORY_KEYS.map((key) => [key, `${I18N_NAMESPACE}.${key}`]),
  ) as Record<CategoryKey, `${typeof I18N_NAMESPACE}.${CategoryKey}`>;

/** Spanish labels kept for backward compatibility with legacy DB rows. */
export const CATEGORY_LABELS_ES: Record<CategoryKey, string> = {
  sales: "Ventas",
  payroll: "Nómina",
  services: "Servicios",
  materials: "Materiales",
  marketing: "Marketing",
  transport_delivery: "Transporte / Delivery",
  entertainment: "Entretenimiento",
  coffee: "Café",
  groceries: "Mercado",
  restaurant: "Restaurante",
  transport: "Transporte",
  telecommunications: "Telecomunicaciones",
  utilities: "Servicios públicos",
  insurance: "Seguros",
  health: "Salud",
  education: "Educación",
  transfer_finance: "Transferencia/Finanzas",
  clothing: "Ropa",
  travel: "Viajes",
  pets: "Mascotas",
  shopping: "Compras",
  other: "Otros",
};

/**
 * @deprecated Use `CATEGORY_KEYS` plus `CATEGORY_I18N_KEYS` for new code.
 * This array preserves the old Spanish label surface for backwards-compatible
 * consumers while the canonical storage format migrates to stable keys.
 */
export const COMMON_CATEGORIES = CATEGORY_KEYS.map((key) => CATEGORY_LABELS_ES[key]);

/** Reverse lookup: normalized Spanish label → stable key. */
const labelToKeyMap: Record<string, CategoryKey> = Object.fromEntries(
  CATEGORY_KEYS.map((key) => [normalizeCategoryValue(CATEGORY_LABELS_ES[key]), key]),
) as Record<string, CategoryKey>;

function normalizeCategoryValue(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Convert any stored category value (stable key or legacy Spanish label) to a
 * stable key. Falls back to `"other"` when the value is unknown.
 */
export function normalizeCategoryToKey(value?: string | null): CategoryKey {
  if (!value) return "other";
  const trimmed = value.trim();
  if (!trimmed) return "other";

  // Exact key match.
  if ((CATEGORY_KEYS as readonly string[]).includes(trimmed)) {
    return trimmed as CategoryKey;
  }

  // Normalized key match (handles slug-like variants).
  const normalizedKey = normalizeCategoryValue(trimmed);
  if ((CATEGORY_KEYS as readonly string[]).includes(normalizedKey)) {
    return normalizedKey as CategoryKey;
  }

  // Legacy Spanish label match.
  const fromLabel = labelToKeyMap[normalizedKey];
  if (fromLabel) return fromLabel;

  return "other";
}

/**
 * Return the full i18n key for a stored category value. Unknown values fall back
 * to `transactionCategories.other`.
 */
export function getCategoryI18nKey(
  value?: string | null,
): `${typeof I18N_NAMESPACE}.${CategoryKey}` {
  const key = normalizeCategoryToKey(value);
  return CATEGORY_I18N_KEYS[key];
}

/** Check whether a stored value maps to a known category. */
export function isKnownCategory(value?: string | null): boolean {
  if (!value) return false;
  return normalizeCategoryToKey(value) !== "other" || value.trim() === "other";
}
