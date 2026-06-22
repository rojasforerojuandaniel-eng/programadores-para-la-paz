import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildMetadata } from "@/lib/seo-metadata";
import { getOrCreateAuthOrg } from "@/lib/auth";
import { getLocale } from "@/lib/locale-server";
import esMessages from "../../../messages/es.json";
import enMessages from "../../../messages/en.json";
import OnboardingFlow from "./onboarding-flow";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "onboarding.meta" });
  return buildMetadata({
    title: t("title"),
    description: t("description"),
    path: "/onboarding",
    keywords: locale === "en"
      ? ["onboarding", "set up account", "Colombia finance", "profile"]
      : ["onboarding", "configurar cuenta", "finanzas Colombia", "perfil"],
  });
}

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