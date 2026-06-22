import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo-metadata";
import { getLocale } from "@/lib/locale-server";
import { OfflineContent } from "@/components/offline-content";
import esMessages from "../../../messages/es.json";
import enMessages from "../../../messages/en.json";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "offline" });

  return buildMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/offline",
    noIndex: true,
  });
}

export default async function OfflinePage() {
  const locale = await getLocale();
  setRequestLocale(locale);
  const messages = locale === "en" ? enMessages : esMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <OfflineContent />
    </NextIntlClientProvider>
  );
}