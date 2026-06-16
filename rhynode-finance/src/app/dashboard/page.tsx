import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { dashboardMetadata } from "@/lib/dashboard-metadata";
import type { TransactionWhereInput } from "@/generated/prisma/models/Transaction";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Brain, Calendar } from "lucide-react";
import {
  mergeLayouts,
  type WidgetLayoutItem,
  type DashboardWidget,
} from "@/lib/widgets";
import { DraggableDashboard } from "@/components/dashboard/draggable-dashboard";
import { XPBar } from "@/components/dashboard/xp-bar";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { LeftWidget } from "@/components/dashboard/left-widget";
import { RightWidget } from "@/components/dashboard/right-widget";
import { HealthScore } from "@/components/dashboard/health-score";
import { EconomicIndicatorsWidget } from "@/components/dashboard/economic-indicators-widget";
import { fetchEconomicIndicators } from "@/lib/economic-indicators";
import type { UserScope } from "@/lib/scope";

const Anomalies = dynamic(
  () => import("@/components/dashboard/anomalies").then((mod) => mod.Anomalies),
  { loading: () => <WidgetLoading /> }
);

const AntExpenses = dynamic(
  () => import("@/components/dashboard/ant-expenses").then((mod) => mod.AntExpenses),
  { loading: () => <WidgetLoading /> }
);

export const metadata = dashboardMetadata(
  "Resumen",
  "Visualiza tu salud financiera, KPIs, gastos hormiga, anomalías y progreso de gamificación en Rhynode."
);

function ScopeBadge({ scope }: { scope: UserScope }) {
  const label = scope === "PERSONAL" ? "Personal" : scope === "BUSINESS" ? "Empresa" : "Ambas";
  return <Badge variant="outline">{label}</Badge>;
}

function KpiGridLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

function WidgetLoading() {
  return <div className="h-72 animate-pulse rounded-xl bg-muted" />;
}

function getMonthRange() {
  const now = new Date();
  return {
    start: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)),
    end: new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)),
  };
}

async function getHealthScores(userId: string | undefined, orgId: string, scope: UserScope) {
  if (!userId || (scope !== "PERSONAL" && scope !== "BOTH")) {
    return {
      savingsScore: 50,
      debtScore: 50,
      budgetScore: 50,
      goalsScore: 50,
      diversificationScore: 50,
    };
  }

  const prisma = getPrisma();
  const { start, end } = getMonthRange();

  const txnBaseWhere: TransactionWhereInput = userId
    ? { organizationId: orgId, scope: "PERSONAL", OR: [{ userId }, { userId: null }] }
    : { organizationId: orgId, scope: "PERSONAL" };

  const [
    incomeAgg,
    expenseAgg,
    debts,
    budgets,
    goals,
    accounts,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...txnBaseWhere, type: "INCOME", date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...txnBaseWhere, type: "EXPENSE", date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.debt.findMany({
      where: { userId, status: "ACTIVE" },
      select: { remainingAmount: true, principalAmount: true },
    }),
    prisma.budget.findMany({
      where: { userId },
      select: { spent: true, amount: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: "ACTIVE" },
      select: { currentAmount: true, targetAmount: true },
    }),
    prisma.account.findMany({
      where: { userId },
      select: { id: true },
    }),
  ]);

  const income = decimalToNumber(incomeAgg._sum.amount);
  const expense = decimalToNumber(expenseAgg._sum.amount);

  let savingsScore: number;
  if (income <= 0) {
    savingsScore = expense <= 0 ? 100 : 0;
  } else {
    const ratio = (income - expense) / income;
    savingsScore = Math.round(Math.max(0, Math.min(100, 50 + ratio * 50)));
  }

  let debtScore: number;
  if (debts.length === 0) {
    debtScore = 100;
  } else {
    const totalPrincipal = debts.reduce((s, d) => s + decimalToNumber(d.principalAmount), 0);
    const totalRemaining = debts.reduce((s, d) => s + decimalToNumber(d.remainingAmount), 0);
    if (totalPrincipal <= 0) {
      debtScore = totalRemaining <= 0 ? 100 : 50;
    } else {
      debtScore = Math.round(Math.max(0, Math.min(100, (1 - totalRemaining / totalPrincipal) * 100)));
    }
  }

  let budgetScore: number;
  if (budgets.length === 0) {
    budgetScore = 100;
  } else {
    const budgetScores = budgets.map((b) => {
      const amount = decimalToNumber(b.amount);
      if (amount <= 0) return 100;
      const ratio = decimalToNumber(b.spent) / amount;
      return Math.max(0, Math.min(100, (1 - Math.max(0, ratio - 1)) * 100));
    });
    budgetScore = Math.round(budgetScores.reduce((s, sc) => s + sc, 0) / budgetScores.length);
  }

  let goalsScore: number;
  if (goals.length === 0) {
    goalsScore = 100;
  } else {
    const goalScores = goals.map((g) => {
      const targetAmount = decimalToNumber(g.targetAmount);
      if (targetAmount <= 0) return 100;
      return Math.max(0, Math.min(100, (decimalToNumber(g.currentAmount) / targetAmount) * 100));
    });
    goalsScore = Math.round(goalScores.reduce((s, sc) => s + sc, 0) / goalScores.length);
  }

  const diversificationScore = Math.min(100, Math.max(0, accounts.length * 25));

  return {
    savingsScore,
    debtScore,
    budgetScore,
    goalsScore,
    diversificationScore,
  };
}

async function UpcomingEvents({ userId, currency }: { userId: string | undefined; currency: string }) {
  if (!userId) return null;
  const prisma = getPrisma();
  const now = new Date();
  const monthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

  const [debts, recurring, goals] = await Promise.all([
    prisma.debt.findMany({
      where: { userId, status: "ACTIVE", dueDate: { gte: now, lte: monthEnd } },
      select: { id: true, name: true, dueDate: true, remainingAmount: true, currency: true },
      take: 2,
    }),
    prisma.recurringTransaction.findMany({
      where: { userId, status: "ACTIVE", nextDueDate: { gte: now, lte: monthEnd } },
      select: { id: true, name: true, nextDueDate: true, amount: true },
      take: 2,
    }),
    prisma.goal.findMany({
      where: { userId, status: "ACTIVE", deadline: { gte: now, lte: monthEnd } },
      select: { id: true, name: true, deadline: true, targetAmount: true, currency: true },
      take: 2,
    }),
  ]);

  const events = [
    ...debts.map((d) => ({ id: `debt-${d.id}`, title: d.name, date: d.dueDate as Date, amount: d.remainingAmount, currency: d.currency, type: "Deuda" })),
    ...recurring.map((r) => ({ id: `rec-${r.id}`, title: r.name, date: r.nextDueDate as Date, amount: r.amount, currency, type: "Recurrente" })),
    ...goals.map((g) => ({ id: `goal-${g.id}`, title: g.name, date: g.deadline as Date, amount: g.targetAmount, currency: g.currency, type: "Meta" })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 3);

  if (events.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Próximos eventos</h2>
        <div className="rounded-xl border border-border surface-elevated-2 p-4">
          <p className="text-sm text-muted-foreground">No hay eventos financieros próximos este mes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Próximos eventos</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {events.map((ev) => (
          <div key={ev.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{ev.title}</p>
              <p className="text-xs text-muted-foreground">
                {ev.type} · {new Intl.DateTimeFormat("es-CO", { month: "short", day: "numeric" }).format(new Date(ev.date))}
                {ev.amount !== undefined && ` · ${new Intl.NumberFormat("es-CO", { style: "currency", currency: ev.currency || currency, maximumFractionDigits: 0 }).format(decimalToNumber(ev.amount))}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const org = await requireAuth();
  if (!org) {
    redirect("/sign-in");
  }

  const profile = await getUserProfile();
  const scope = (profile?.scope ?? "PERSONAL") as UserScope;

  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const streakDays = profile?.streakDays ?? 0;
  const nextLevelXp = level * 100;

  const healthScores = await getHealthScores(profile?.id, org.id, scope);

  const indicatorsData = await fetchEconomicIndicators();

  const metadata = (profile?.metadata ?? {}) as { widgets?: WidgetLayoutItem[] };
  const initialLayout = mergeLayouts(metadata.widgets);

  const widgets: DashboardWidget[] = [
    {
      id: "xp-bar",
      label: "Barra de XP",
      content: <XPBar level={level} xp={xp} nextLevelXp={nextLevelXp} streakDays={streakDays} />,
    },
    {
      id: "health-score",
      label: "Health Score",
      content:
        scope === "PERSONAL" || scope === "BOTH" ? (
          <HealthScore {...healthScores} />
        ) : null,
    },
    {
      id: "kpi-grid",
      label: "KPIs",
      content: (
        <Suspense fallback={<KpiGridLoading />}>
          <KpiGrid scope={scope} orgId={org.id} userId={profile?.id} currency={org.currency} />
        </Suspense>
      ),
    },
    {
      id: "anomalies",
      label: "Anomalías",
      content: <Anomalies />,
    },
    {
      id: "left-widget",
      label: "Transacciones / Facturas",
      content: (
        <Suspense fallback={<WidgetLoading />}>
          <LeftWidget scope={scope} orgId={org.id} userId={profile?.id} currency={org.currency} />
        </Suspense>
      ),
    },
    {
      id: "right-widget",
      label: "Presupuestos / Vencimientos",
      content: (
        <Suspense fallback={<WidgetLoading />}>
          <RightWidget scope={scope} orgId={org.id} userId={profile?.id} currency={org.currency} />
        </Suspense>
      ),
    },
    {
      id: "ant-expenses",
      label: "Gastos Hormiga",
      content: <AntExpenses />,
    },
    {
      id: "recent-events",
      label: "Próximos Eventos",
      content: (
        <Suspense fallback={<WidgetLoading />}>
          <UpcomingEvents userId={profile?.id} currency={org.currency} />
        </Suspense>
      ),
    },
    {
      id: "economic-indicators",
      label: "Indicadores Colombia",
      content: (
        <EconomicIndicatorsWidget
          indicators={indicatorsData.indicators}
          lastUpdated={indicatorsData.lastUpdated}
          attribution={indicatorsData.source}
        />
      ),
    },
  ].filter((widget) => widget.content !== null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Resumen</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tu panorama financiero de hoy</p>
        </div>
        <div className="flex items-center gap-2">
          <ScopeBadge scope={scope} />
          <Link href="/dashboard/advisor">
            <Button variant="outline" size="sm" className="gap-2">
              <Brain className="h-4 w-4" />
              AI Advisor
            </Button>
          </Link>
        </div>
      </div>

      <DraggableDashboard initialLayout={initialLayout} widgets={widgets} />
    </div>
  );
}
