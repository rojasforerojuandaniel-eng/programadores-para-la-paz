import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getOrCreateAuthOrg, getUserProfile } from "@/lib/auth";
import { buildMetadata } from "@/lib/seo-metadata";
import { getLocale } from "@/lib/locale-server";
import { DashboardLangSync } from "@/components/dashboard/lang-sync";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { QuickActionsFab } from "@/components/dashboard/quick-actions-fab";
import { PullToRefresh } from "@/components/dashboard/pull-to-refresh";
import { ScopeProvider } from "@/lib/scope-context";
import type { UserScope } from "@/lib/scope";
import esMessages from "../../../messages/es.json";
import enMessages from "../../../messages/en.json";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "dashboard.meta.layout" });
  return buildMetadata({
    title: t("title"),
    description: t("description"),
    path: "/dashboard",
    keywords:
      locale === "en"
        ? [
            "finance dashboard",
            "personal finance",
            "business finance",
            "Colombia finance management",
            "DIAN accounting",
            "Wompi",
          ]
        : [
            "dashboard financiero",
            "finanzas personales",
            "finanzas empresariales",
            "gestión financiera Colombia",
            "contabilidad DIAN",
            "Wompi",
          ],
  });
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const org = await getOrCreateAuthOrg();
  if (!org) {
    redirect("/sign-in");
  }

  if (!org.onboardingCompleted) {
    redirect("/onboarding");
  }

  const profile = await getUserProfile();
  const initialScope = (profile?.scope ?? "PERSONAL") as UserScope;
  const hasBusiness = profile?.hasBusiness ?? false;

  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard" });
  const messages = locale === "en" ? enMessages : esMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DashboardLangSync locale={locale} />
      <div className="min-h-screen bg-background">
        <ScopeProvider initialScope={initialScope} hasBusiness={hasBusiness}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
          >
            {t("skipToContent")}
          </a>
          <Sidebar />
          <MobileNav />
          <QuickActionsFab />
          <main id="main-content" className="pt-14 pb-20 lg:pt-4 lg:pb-4 lg:pl-64">
            <PullToRefresh className="mx-auto max-w-7xl p-4 sm:p-6">
              {children}
            </PullToRefresh>
          </main>
        </ScopeProvider>
      </div>
    </NextIntlClientProvider>
  );
}
