import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import WebhookLogsClient from "@/components/dashboard/settings/webhook-logs/webhook-logs-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Logs de Webhooks — Rhynode",
  description: "Observabilidad de eventos de webhooks de Stripe y Wompi",
};

export default async function WebhookLogsPage() {
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
