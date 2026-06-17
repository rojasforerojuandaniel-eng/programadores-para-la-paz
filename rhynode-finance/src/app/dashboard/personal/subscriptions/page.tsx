import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { getUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import {
  CreditCard,
  RefreshCw,
  CalendarDays,
  Wallet,
  BarChart3,
  Layers,
} from "lucide-react";
import type { SubscriptionItem } from "./subscription-utils";
import {
  buildTransactionIndex,
  computeSubscriptionMeta,
  formatCurrency,
  monthlyEquivalent,
  yearlyEquivalent,
  formatDate,
} from "./subscription-utils";
import { SubscriptionList } from "./subscription-list";

function DetectButton({ className }: { className?: string }) {
  return (
    <form action="/api/personal/subscriptions/detect" method="POST">
      <Button type="submit" className={cn("gap-2", className)}>
        <RefreshCw className="h-4 w-4" />
        Detectar
      </Button>
    </form>
  );
}

async function SubscriptionsContent() {
  const profile = await getUserProfile();
  if (!profile) return null;

  const [subscriptions, transactions] = await Promise.all([
    prisma.detectedSubscription.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.findMany({
      where: { userId: profile.id, scope: "PERSONAL", type: "EXPENSE" },
      orderBy: { date: "desc" },
    }),
  ]);

  const txByNormalizedDesc = buildTransactionIndex(transactions);

  const items: SubscriptionItem[] = subscriptions.map((sub) => {
    const meta = computeSubscriptionMeta(sub, txByNormalizedDesc);
    return {
      id: sub.id,
      name: sub.name,
      description: sub.description,
      amount: decimalToNumber(sub.amount),
      currency: sub.currency,
      frequency: sub.frequency,
      provider: sub.provider,
      category: sub.category,
      status: sub.status,
      lastPaidAt: sub.lastPaidAt?.toISOString() ?? null,
      lastDetectedAt: sub.lastDetectedAt.toISOString(),
      ...meta,
    };
  });

  const activeItems = items.filter((item) => item.status !== "CANCELLED");

  const totalMonthly = activeItems.reduce((sum, item) => {
    return sum + monthlyEquivalent(item.amount, item.frequency);
  }, 0);

  const totalYearly = activeItems.reduce((sum, item) => {
    return sum + yearlyEquivalent(item.amount, item.frequency);
  }, 0);

  const upcomingRenewal = activeItems
    .filter((item) => item.nextRenewal)
    .sort(
      (a, b) =>
        new Date(a.nextRenewal!).getTime() - new Date(b.nextRenewal!).getTime()
    )[0]?.nextRenewal ?? null;

  const emptyState = (
    <EmptyStateCard
      variant="lg"
      icon={CreditCard}
      title="Detecta suscripciones automáticamente"
      description="Analizamos tus transacciones para encontrar pagos recurrentes, detectar subidas de precio y ayudarte a ahorrar."
      hint="Presiona detectar para descubrir tus suscripciones."
      action={<DetectButton className="w-full" />}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">Suscripciones</h1>
          <p className="body-default mt-1">
            Detecta y monitorea tus suscripciones automáticas
          </p>
        </div>
        <DetectButton />
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Gasto mensual estimado"
            value={formatCurrency(totalMonthly, "COP")}
            icon={Wallet}
          />
          <KpiCard
            label="Gasto anual estimado"
            value={formatCurrency(totalYearly, "COP")}
            icon={BarChart3}
          />
          <KpiCard
            label="Suscripciones activas"
            value={activeItems.length}
            icon={Layers}
          />
          <KpiCard
            label="Próxima renovación"
            value={<div className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(upcomingRenewal)}</span>
              </div>
            }
            icon={CalendarDays}
          />
        </div>
      )}

      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <SubscriptionList items={items} emptyState={emptyState} />
      </Suspense>
    </div>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
      <SubscriptionsContent />
    </Suspense>
  );
}
