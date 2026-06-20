import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { LandingRedirect } from "@/components/auth/landing-redirect";
import { LandingPageV2 } from "@/components/landing/landing-page";
import { LocaleAutoDetect, LocaleSync } from "@/components/landing/locale-switcher";
import esMessages from "../../messages/es.json";

export default function LandingPage() {
  setRequestLocale("es");
  return (
    <NextIntlClientProvider locale="es" messages={esMessages}>
      <LocaleSync locale="es" />
      <LocaleAutoDetect />
      <LandingRedirect />
      <LandingPageV2 />
    </NextIntlClientProvider>
  );
}