export const SUPPORTED_LOCALES = ["es", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";
export const LOCALE_COOKIE = "rhynode-locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "es" || value === "en";
}

/**
 * Client-safe read of the locale cookie. Safe to import from client components
 * — it does NOT touch `next/headers`. Server components should use
 * `getLocale` from `@/lib/locale-server` instead.
 */
export function getLocaleClient(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`));
  const value = match?.split("=")[1];
  return isLocale(value) ? value : DEFAULT_LOCALE;
}