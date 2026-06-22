import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
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

  return buildMetadata({
    title: "Pago seguro",
    description:
      "Realiza tu pago de forma segura con Rhynode. Aceptamos tarjeta vía Stripe y Wompi para Colombia.",
    path: `/pay/${slug}`,
    keywords: ["pago seguro", "Wompi", "Stripe", "pasarela de pagos Colombia"],
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