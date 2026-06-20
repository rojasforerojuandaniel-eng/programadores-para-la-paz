import { defineRouting } from "next-intl/routing";

/**
 * next-intl routing config.
 *
 * `localePrefix: "as-needed"` keeps the default locale (es) WITHOUT a URL
 * prefix — existing indexed URLs (/, /dashboard, /sign-in, ...) stay identical,
 * so SEO and existing links are preserved. Only /en gets a prefix.
 */
export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "as-needed",
});