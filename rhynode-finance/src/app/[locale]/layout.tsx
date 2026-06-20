import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

/**
 * Layout for the localized segment `app/[locale]/`.
 *
 * Stage 2 foundation: scaffolded but NOT yet wired to the middleware routing.
 * The route move (landing + auth + dashboard into [locale]) and the combined
 * Clerk + next-intl middleware activation happen in the next Fase A step, so the
 * existing flat-routes + per-page-provider stage-1 setup stays live and untouched
 * until the full big-bang move is ready and verified.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}