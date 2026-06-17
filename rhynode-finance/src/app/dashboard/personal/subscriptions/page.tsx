import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { getUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { CreditCard, RefreshCw } from "lucide-react";
import { addMonths } from "date-fns";
import { SubscriptionManager, SubscriptionView } from "./subscription-manager";

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

const VALID_FILTERS = ["ACTIVE", "PENDING_CANCELLATION", "CANCELED", "ALL"];

function normalizeDescription(text: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\d+/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function daysSince(date: Date | null): number {
  if (!date) return Infinity;
  return Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function monthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case "MONTHLY":
      return amount;
    case "QUARTERLY":
      return amount / 3;
    case "YEARLY":
      return amount / 12;
    default:
      return amount;
  }
}

function nextChargeDate(
  lastPaidAt: Date | null,
  fallback: Date,
  frequency: string
): Date | null {
  const base = lastPaidAt || fallback;
  const months =
    frequency === "QUARTERLY" ? 3 : frequency === "YEARLY" ? 12 : 1;
  const msPerPeriod = months * 30 * 24 * 60 * 60 * 1000;
  const periods = Math.max(
    1,
    Math.ceil((Date.now() - base.getTime()) / msPerPeriod)
  );
  return addMonths(base, periods * months);
}

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

async function SubscriptionsContent({ filter }: { filter: string }) {
  const profile = await getUserProfile();
  if (!profile) return null;

  const whereClause: { userId: string; status?: string | { in: string[] } } = {
    userId: profile.id,
  };
  if (filter === "CANCELED") {
    whereClause.status = { in: ["CANCELED", "CANCELLED"] };
  } else if (filter !== "ALL") {
    whereClause.status = filter;
  }

  const [subscriptions, transactions] = await Promise.all([
    prisma.detectedSubscription.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.findMany({
      where: { userId: profile.id, scope: "PERSONAL", type: "EXPENSE" },
      orderBy: { date: "desc" },
    }),
  ]);

  const txByNormalizedDesc = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    const key = normalizeDescription(tx.description);
    if (!key) continue;
    const list = txByNormalizedDesc.get(key) || [];
    list.push(tx);
    txByNormalizedDesc.set(key, list);
  }

  if (subscriptions.length === 0 && filter === "ACTIVE") {
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
        <EmptyStateCard
          icon={CreditCard}
          title="Detecta suscripciones automáticamente"
          description="Analizamos tus transacciones para encontrar pagos recurrentes y ayudarte a ahorrar."
          hint="Presiona detectar para descubrir tus suscripciones."
          action={<DetectButton className="w-full" />}
        />
      </div>
    );
  }

  const activeSubscriptions = subscriptions.filter(
    (sub) => sub.status === "ACTIVE"
  );

  const totalMonthly = activeSubscriptions.reduce((sum, sub) => {
    return sum + monthlyEquivalent(decimalToNumber(sub.amount), sub.frequency);
  }, 0);

  const annualSpend = totalMonthly * 12;

  const nextRenewal = activeSubscriptions
    .map((sub) =>
      nextChargeDate(sub.lastPaidAt, sub.lastDetectedAt, sub.frequency)
    )
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0] || null;

  const subsWithMeta: SubscriptionView[] = subscriptions.map((sub) => {
    const key = normalizeDescription(sub.description);
    const txs = txByNormalizedDesc.get(key) || [];
    let increased = false;
    if (txs.length >= 2) {
      const sorted = [...txs].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const last = decimalToNumber(sorted[0].amount);
      const prev = decimalToNumber(sorted[1].amount);
      increased = last > prev;
    }
    const unused = sub.lastPaidAt ? daysSince(sub.lastPaidAt) > 45 : false;

    return {
      id: sub.id,
      name: sub.name,
      description: sub.description,
      amount: decimalToNumber(sub.amount),
      currency: sub.currency,
      frequency: sub.frequency as "MONTHLY" | "QUARTERLY" | "YEARLY",
      provider: sub.provider,
      category: sub.category,
      status: (sub.status === "CANCELLED" ? "CANCELED" : sub.status) as
        | "ACTIVE"
        | "PENDING_CANCELLATION"
        | "CANCELED",
      canceledAt: sub.canceledAt,
      cancellationUrl: sub.cancellationUrl,
      lastDetectedAt: sub.lastDetectedAt,
      lastPaidAt: sub.lastPaidAt,
      createdAt: sub.createdAt,
      nextChargeDate: nextChargeDate(
        sub.lastPaidAt,
        sub.lastDetectedAt,
        sub.frequency
      ),
      increased,
      unused,
    };
  });

  return (
    <SubscriptionManager
      subscriptions={subsWithMeta}
      currency="COP"
      initialFilter={filter}
      kpis={{
        monthlySpend: totalMonthly,
        annualSpend,
        activeCount: activeSubscriptions.length,
        nextRenewal,
        totalCount: subscriptions.length,
      }}
    />
  );
}

export default async function SubscriptionsPage({ searchParams }: PageProps) {
  const { filter: rawFilter } = await searchParams;
  const filter =
    rawFilter && VALID_FILTERS.includes(rawFilter) ? rawFilter : "ACTIVE";

  return (
    <Suspense
      fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}
    >
      <SubscriptionsContent filter={filter} />
    </Suspense>
  );
}
