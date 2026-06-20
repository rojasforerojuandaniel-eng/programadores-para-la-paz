import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/decimal";
import { getLocale } from "@/lib/locale-server";
import { formatCurrency } from "@/lib/format";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CreateSubscriptionDialog } from "./create-subscription-dialog";
import { addFrequency, daysUntil } from "../subscriptions/subscription-utils";
import { CreditCard, Wallet, CalendarDays } from "lucide-react";

export default async function CalendarPage() {
  const org = await requireAuth();
  if (!org) redirect("/sign-in");

  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.calendar" });

  const profile = await getUserProfile();
  const subscriptions = profile
    ? await prisma.detectedSubscription.findMany({
        where: { userId: profile.id, status: { not: "CANCELLED" } },
        orderBy: { lastPaidAt: "asc" },
      })
    : [];

  const upcoming = subscriptions
    .filter((s): s is typeof s & { lastPaidAt: Date } => s.lastPaidAt !== null)
    .map((s) => {
      const nextRenewal = addFrequency(s.lastPaidAt, s.frequency);
      const remaining = daysUntil(nextRenewal.toISOString());
      return {
        ...s,
        amount: decimalToNumber(s.amount),
        nextRenewal,
        daysRemaining: remaining,
      };
    })
    .filter((s): s is typeof s & { daysRemaining: number } => s.daysRemaining !== null)
    .sort((a, b) => a.nextRenewal.getTime() - b.nextRenewal.getTime());

  const totalEstimated = upcoming.reduce((sum, s) => sum + s.amount, 0);
  const nextSubscription = upcoming[0];

  const daysNextValue =
    nextSubscription?.daysRemaining === undefined
      ? "—"
      : nextSubscription.daysRemaining <= 0
        ? nextSubscription.daysRemaining === 0
          ? t("days.today")
          : t("days.overdue", { days: Math.abs(nextSubscription.daysRemaining) })
        : t("days.left", { days: nextSubscription.daysRemaining });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">{t("subtitle")}</p>
        </div>
        <CreateSubscriptionDialog />
      </div>

      {subscriptions.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label={t("kpis.total")}
            value={formatCurrency(totalEstimated, org.currency, locale)}
            icon={Wallet}
          />
          <KpiCard
            label={t("kpis.upcoming")}
            value={upcoming.length}
            icon={CreditCard}
          />
          <KpiCard
            label={t("kpis.daysNext")}
            value={daysNextValue}
            icon={CalendarDays}
            valueClassName={
              nextSubscription && nextSubscription.daysRemaining <= 3
                ? nextSubscription.daysRemaining <= 0
                  ? "text-rose-600"
                  : "text-amber-600"
                : undefined
            }
          />
        </div>
      )}

      <CalendarView orgCurrency={org.currency} />
    </div>
  );
}