import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOrCreateAuthOrg, getUserProfile } from "@/lib/auth";
import { buildMetadata } from "@/lib/seo-metadata";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { QuickActionsFab } from "@/components/dashboard/quick-actions-fab";
import { PullToRefresh } from "@/components/dashboard/pull-to-refresh";
import { ScopeProvider } from "@/lib/scope-context";
import type { UserScope } from "@/lib/scope";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Dashboard",
  description:
    "Gestiona tus finanzas personales y empresariales en Colombia: transacciones, presupuestos, facturas electrónicas, impuestos DIAN, inversiones y asesoría con IA.",
  path: "/dashboard",
  keywords: [
    "dashboard financiero",
    "finanzas personales",
    "finanzas empresariales",
    "gestión financiera Colombia",
    "contabilidad DIAN",
    "Wompi",
  ],
});

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

  return (
    <div className="min-h-screen bg-background">
      <ScopeProvider initialScope={initialScope} hasBusiness={hasBusiness}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
        >
          Saltar al contenido principal
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
  );
}
