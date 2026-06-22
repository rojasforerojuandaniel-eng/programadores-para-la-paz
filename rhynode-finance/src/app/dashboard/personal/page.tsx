import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getOrCreateAuthOrg, getUserProfile } from "@/lib/auth";
import { getLocale } from "@/lib/locale-server";
import { ChecklistCard } from "@/components/onboarding/checklist-card";
import { buildMetadata } from "@/lib/seo-metadata";

export const metadata = buildMetadata({
  title: "Finanzas personales",
  description:
    "Gestiona tus metas, cuentas, presupuestos y movimientos personales en Rhynode.",
  path: "/dashboard/personal",
  keywords: [
    "finanzas personales",
    "metas de ahorro",
    "presupuestos",
    "movimientos",
  ],
});

function getInitialChecklist(profile: { metadata: unknown } | null) {
  const metadata = (profile?.metadata ?? {}) as Record<string, unknown>;
  const checklist = metadata.onboardingChecklist;
  if (
    typeof checklist === "object" &&
    checklist !== null &&
    !Array.isArray(checklist)
  ) {
    return checklist as Record<string, boolean>;
  }
  return {} as Record<string, boolean>;
}

export default async function PersonalDashboardPage() {
  const org = await getOrCreateAuthOrg();
  if (!org) {
    redirect("/sign-in");
  }

  const profile = await getUserProfile();
  const checklist = getInitialChecklist(profile);
  const done = Object.values(checklist).filter(Boolean).length;
  const total = 5;
  const progress = Math.round((done / total) * 100);

  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.personalHome" });

  return (
    <div className="space-y-6">
      {progress < 100 && <ChecklistCard initialItems={checklist} />}

      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>
    </div>
  );
}