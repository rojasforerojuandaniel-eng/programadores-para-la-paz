import type { Locale } from "./locale";

/**
 * Locale-aware formatting helpers. Pure Intl, usable on both server and
 * client. Pass the active locale (from getLocale() server-side, useLocale()
 * client-side via the NextIntlClientProvider, or getLocaleClient()).
 *
 * es → es-CO conventions (. thousands, , decimal); en → en-US (, thousands,
 * . decimal). Currency code (COP, USD, …) is independent of the locale.
 */

const intlLocale = (locale: Locale): string => (locale === "en" ? "en-US" : "es-CO");

export function formatCurrency(
  value: number,
  currency: string,
  locale: Locale,
  opts?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    ...opts,
  }).format(value);
}

export function formatNumber(
  value: number,
  locale: Locale,
  opts?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(intlLocale(locale), opts).format(value);
}

export function formatDate(
  date: Date | string | number,
  locale: Locale,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(intlLocale(locale), opts).format(d);
}