import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOrCreateAuthOrg, getUserProfile } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { QuickActionsFab } from "@/components/dashboard/quick-actions-fab";
import { ScopeProvider } from "@/lib/scope-context";
import type { UserScope } from "@/lib/scope";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard — Rhynode",
  description:
    "Gestiona tus finanzas personales y empresariales: transacciones, presupuestos, facturas, impuestos, inversiones y asesoría con IA.",
};

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
        <Sidebar />
        <QuickActionsFab />
        <main className="pt-14 pb-20 lg:pt-4 lg:pb-4 lg:pl-64">
          <div className="mx-auto max-w-7xl p-4 sm:p-6">
            {children}
          </div>
        </main>
      </ScopeProvider>
    </div>
  );
}
