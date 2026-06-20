import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./locale";

export type { Locale } from "./locale";

/**
 * Server-only active locale, read from the `rhynode-locale` cookie. Must NOT be
 * imported from client components (it uses `next/headers`).
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}