import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo-metadata";
import { getLocale } from "@/lib/locale-server";
import esMessages from "../../../../messages/es.json";
import enMessages from "../../../../messages/en.json";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "pay.meta" });

  return buildMetadata({
    title: t("title"),
    description: t("description"),
    path: `/pay/${slug}`,
    keywords: [t("kw1"), t("kw2"), t("kw3"), t("kw4")],
    noIndex: true,
  });
}

export default async function PayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  setRequestLocale(locale);
  const messages = locale === "en" ? enMessages : esMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}