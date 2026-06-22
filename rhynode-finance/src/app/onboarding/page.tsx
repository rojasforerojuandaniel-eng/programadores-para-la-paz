import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo-metadata";
import { getOrCreateAuthOrg } from "@/lib/auth";
import { getLocale } from "@/lib/locale-server";
import esMessages from "../../../messages/es.json";
import enMessages from "../../../messages/en.json";
import OnboardingFlow from "./onboarding-flow";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Configura tu cuenta",
  description:
    "Completa tu perfil en Rhynode y empieza a gestionar tus finanzas personales o empresariales en minutos. Configurado para Colombia.",
  path: "/onboarding",
  keywords: ["onboarding", "configurar cuenta", "finanzas Colombia", "perfil"],
});

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.userId) {
    redirect("/sign-in");
  }

  const org = await getOrCreateAuthOrg();

  if (!org) {
    redirect("/sign-in");
  }

  if (org.onboardingCompleted) {
    redirect("/dashboard");
  }

  const locale = await getLocale();
  setRequestLocale(locale);
  const messages = locale === "en" ? enMessages : esMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <OnboardingFlow />
    </NextIntlClientProvider>
  );
}