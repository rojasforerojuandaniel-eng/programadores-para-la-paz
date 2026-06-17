import { redirect } from "next/navigation";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/decimal";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CreateSubscriptionDialog } from "./create-subscription-dialog";
import { addFrequency, daysUntil } from "../subscriptions/subscription-utils";
import { CreditCard, Wallet, CalendarDays } from "lucide-react";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export default async function CalendarPage() {
  const org = await requireAuth();
  if (!org) redirect("/sign-in");

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

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">Calendario de Pagos</h1>
          <p className="body-default mt-1">
            Visualiza tus suscripciones y vencimientos
          </p>
        </div>
        <CreateSubscriptionDialog />
      </div>

      {subscriptions.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="Total estimado próximos pagos"
            value={formatCurrency(totalEstimated, org.currency)}
            icon={Wallet}
          />
          <KpiCard
            label="Próximos pagos"
            value={upcoming.length}
            icon={CreditCard}
          />
          <KpiCard
            label="Días para el próximo pago"
            value={
              nextSubscription?.daysRemaining === undefined
                ? "—"
                : nextSubscription.daysRemaining <= 0
                  ? nextSubscription.daysRemaining === 0
                    ? "Hoy"
                    : `Vencido hace ${Math.abs(nextSubscription.daysRemaining)} días`
                  : `${nextSubscription.daysRemaining} días`
            }
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
