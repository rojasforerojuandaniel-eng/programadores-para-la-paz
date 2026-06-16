import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { getUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { CreditCard, ArrowUp, RefreshCw, AlertTriangle } from "lucide-react";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function daysSince(date: Date | null): number {
  if (!date) return Infinity;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
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

function DetectButton() {
  return (
    <form action="/api/personal/subscriptions/detect" method="POST">
      <Button type="submit" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Detectar
      </Button>
    </form>
  );
}

async function SubscriptionsContent() {
  const profile = await getUserProfile();
  if (!profile) return null;

  const subscriptions = await prisma.detectedSubscription.findMany({
    where: { userId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  const transactions = await prisma.transaction.findMany({
    where: { userId: profile.id, scope: "PERSONAL", type: "EXPENSE" },
    orderBy: { date: "desc" },
  });

  const totalMonthly = subscriptions.reduce((sum, sub) => {
    return sum + monthlyEquivalent(decimalToNumber(sub.amount), sub.frequency);
  }, 0);

  const txByNormalizedDesc = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    const key = tx.description
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\d+/g, "")
      .replace(/[^a-z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!key) continue;
    const list = txByNormalizedDesc.get(key) || [];
    list.push(tx);
    txByNormalizedDesc.set(key, list);
  }

  const subsWithMeta = subscriptions.map((sub) => {
    const key =
      sub.description
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/\d+/g, "")
        .replace(/[^a-z\s]/g, "")
        .replace(/\s+/g, " ")
        .trim() || "";
    const txs = txByNormalizedDesc.get(key) || [];
    let increased = false;
    if (txs.length >= 2) {
      const sorted = [...txs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const last = decimalToNumber(sorted[0].amount);
      const prev = decimalToNumber(sorted[1].amount);
      if (last > prev) {
        increased = true;
      }
    }
    const unused = daysSince(sub.lastPaidAt) > 45;
    return { ...sub, increased, unused };
  });

  if (subscriptions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="heading-section">Suscripciones</h1>
            <p className="body-default mt-1">Detecta y monitorea tus suscripciones automáticas</p>
          </div>
          <DetectButton />
        </div>
        <EmptyStateCard
          icon={CreditCard}
          title="No se han detectado suscripciones"
          description="Presiona el botón para analizar tus transacciones y descubrir suscripciones recurrentes."
          action={<DetectButton />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">Suscripciones</h1>
          <p className="body-default mt-1">Detecta y monitorea tus suscripciones automáticas</p>
        </div>
        <DetectButton />
      </div>

      <KpiCard
        label="Costo mensual estimado"
        value={formatCurrency(totalMonthly, "COP")}
        icon={CreditCard}
        className="max-w-md"
      />

      <div className="grid grid-cols-1 gap-4">
        {subsWithMeta.map((sub) => (
          <Card key={sub.id} className="surface-elevated-2 rounded-xl border-border">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{sub.name}</span>
                    {sub.unused && (
                      <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-500">
                        <AlertTriangle className="h-3 w-3" /> Sin usar
                      </Badge>
                    )}
                    {sub.increased && (
                      <Badge variant="outline" className="gap-1 border-rose-500/30 text-rose-500">
                        <ArrowUp className="h-3 w-3" /> Subió
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    {sub.provider && <span>{sub.provider} · </span>}
                    <span className="capitalize">{sub.frequency.toLowerCase()}</span>
                    {sub.lastPaidAt && (
                      <span> · Último pago: {new Date(sub.lastPaidAt).toLocaleDateString("es-CO")}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-lg font-semibold">
                  {formatCurrency(decimalToNumber(sub.amount), sub.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(monthlyEquivalent(decimalToNumber(sub.amount), sub.frequency), sub.currency)} / mes
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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
