export type Locale = "es" | "en";

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
