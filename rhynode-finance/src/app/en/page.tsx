import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { LandingRedirect } from "@/components/auth/landing-redirect";
import { LandingPageV2 } from "@/components/landing/landing-page";
import { LocaleSync } from "@/components/landing/locale-switcher";
import enMessages from "../../../messages/en.json";

export const metadata: Metadata = {
  title: "Rhynode — Personal finance & accounting intelligence for Colombia",
  description:
    "Take control of your money, save smarter and grow your business. Rhynode unites personal and business finance with AI for Colombia. Integrate Wompi, comply with DIAN, and manage your accounting and electronic invoicing in minutes.",
  alternates: {
    canonical: "https://rhynode.finance/en",
    languages: {
      "en": "https://rhynode.finance/en",
      "es": "https://rhynode.finance/",
      "x-default": "https://rhynode.finance/",
    },
  },
};

export default function EnLandingPage() {
  setRequestLocale("en");
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <LocaleSync locale="en" />
      <LandingRedirect />
      <LandingPageV2 />
    </NextIntlClientProvider>
  );
}