import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // `requestLocale` comes from the middleware (or the [locale] segment).
  let locale = await requestLocale;

  // Validate that the incoming locale is supported; fall back to default.
  if (!locale || !routing.locales.includes(locale as "es" | "en")) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});