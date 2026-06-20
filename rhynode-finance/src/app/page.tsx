import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingPageV2 } from "@/components/landing/landing-page";
import { LocaleAutoDetect, LocaleSync } from "@/components/landing/locale-switcher";
import esMessages from "../../messages/es.json";

export default async function LandingPage() {
  // Redirect signed-in users to the dashboard server-side (no client-side flash).
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  setRequestLocale("es");
  return (
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <LocaleSync locale="es" />
      <LocaleAutoDetect />
      <LandingPageV2 />
    </NextIntlClientProvider>
  );
}