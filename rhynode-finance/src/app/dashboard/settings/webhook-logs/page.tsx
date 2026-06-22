import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale } from "@/lib/locale-server";
import { buildMetadata } from "@/lib/seo-metadata";
import { requireAuth } from "@/lib/auth";
import WebhookLogsClient from "@/components/dashboard/settings/webhook-logs/webhook-logs-client";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "dashboard.settings.webhookLogs" });

  return buildMetadata({
    title: t("title"),
    description: t("subtitle"),
    path: "/dashboard/settings/webhook-logs",
  });
}

export default async function WebhookLogsPage() {
  const locale = await getLocale();
  setRequestLocale(locale);

  const org = await requireAuth();
  if (!org) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-5">
      <WebhookLogsClient />
    </div>
  );
}
