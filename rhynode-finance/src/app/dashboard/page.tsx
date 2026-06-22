import { decimalToNumber } from "@/lib/decimal";
import { toReminder } from "@/lib/reminders";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale, type Locale } from "@/lib/locale-server";
import { formatCurrency, formatDate as fmtDate } from "@/lib/format";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { SeedDemoButton } from "@/components/dashboard/seed-demo-button";
import { dashboardMetadataLocale } from "@/lib/dashboard-metadata";
import type { Metadata } from "next";
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
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { LeftWidget } from "@/components/dashboard/left-widget";
import { RightWidget } from "@/components/dashboard/right-widget";
import { HealthScore } from "@/components/dashboard/health-score";
import { calculateHealthScore } from "@/lib/health-score";
import { EconomicIndicatorsWidget } from "@/components/dashboard/economic-indicators-widget";
import { DailyBriefing } from "@/components/dashboard/daily-briefing";
import { SmartInsights } from "@/components/dashboard/smart-insights";
import { AiInsightsCard } from "@/components/dashboard/ai-insights-card";
import { AiCopilot } from "@/components/dashboard/ai-copilot";
import { UpcomingBillsCard } from "@/components/dashboard/upcoming-bills-card";
import { fetchEconomicIndicators } from "@/lib/economic-indicators";
import { canAccessBusiness, type UserScope } from "@/lib/scope";
import { BusinessKpiGrid } from "@/components/dashboard/business/business-kpi-grid";
import { QuickActionsCard } from "@/components/dashboard/business/quick-actions-card";
import { RevenueMiniChart } from "@/components/dashboard/business/revenue-mini-chart";
import { RecentInvoicesCard } from "@/components/dashboard/business/recent-invoices-card";


const Anomalies = dynamic(
  () => import("@/components/dashboard/anomalies").then((mod) => mod.Anomalies),
  { loading: () => <WidgetLoading /> },
);

const AntExpenses = dynamic(
  () =>
    import("@/components/dashboard/ant-expenses").then(
      (mod) => mod.AntExpenses,
    ),
  { loading: () => <WidgetLoading /> },
);

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "dashboard.home" });
  return dashboardMetadataLocale(locale, t("title"), t("subtitle"));
}

async function ScopeBadge({ scope, locale }: { scope: UserScope; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "dashboard.home" });
  const label =
    scope === "PERSONAL"
      ? t("scope.personal")
      : scope === "BUSINESS"
        ? t("scope.business")
        : t("scope.both");
  return (
    <Badge variant="outline" className="h-10 px-3 text-xs sm:text-sm">
      {label}
    </Badge>
  );
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

function BusinessKpiGridLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
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
    end: new Date(
      Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    ),
  };
}

async function getHealthScores(
  userId: string | undefined,
  orgId: string,
  scope: UserScope,
) {
  if (!userId || (scope !== "PERSONAL" && scope !== "BOTH")) {
    return calculateHealthScore({ income: 0, expense: 0 });
  }

  const prisma = getPrisma();
  const { start, end } = getMonthRange();

  const txnBaseWhere: TransactionWhereInput = userId
    ? {
        organizationId: orgId,
        scope: "PERSONAL",
        OR: [{ userId }, { userId: null }],
      }
    : { organizationId: orgId, scope: "PERSONAL" };

  const [incomeAgg, expenseAgg, debts, budgets, accounts] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        ...txnBaseWhere,
        type: "INCOME",
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        ...txnBaseWhere,
        type: "EXPENSE",
        date: { gte: start, lte: end },
      },
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
    prisma.account.findMany({
      where: { userId },
      select: { balance: true, type: true },
    }),
  ]);

  return calculateHealthScore({
    income: decimalToNumber(incomeAgg._sum.amount),
    expense: decimalToNumber(expenseAgg._sum.amount),
    debts: debts.map((d) => ({
      principalAmount: decimalToNumber(d.principalAmount),
      remainingAmount: decimalToNumber(d.remainingAmount),
    })),
    budgets: budgets.map((b) => ({
      amount: decimalToNumber(b.amount),
      spent: decimalToNumber(b.spent),
    })),
    accounts: accounts.map((a) => ({
      balance: decimalToNumber(a.balance),
      type: a.type,
    })),
  });
}

async function UpcomingEvents({
  userId,
  currency,
  locale,
}: {
  userId: string | undefined;
  currency: string;
  locale: Locale;
}) {
  if (!userId) return null;
  const t = await getTranslations({ locale, namespace: "dashboard.home" });
  const prisma = getPrisma();
  const now = new Date();
  const monthEnd = new Date(
    Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  );

  const [debts, recurring, goals, reminderNotifications] = await Promise.all([
    prisma.debt.findMany({
      where: { userId, status: "ACTIVE", dueDate: { gte: now, lte: monthEnd } },
      select: {
        id: true,
        name: true,
        dueDate: true,
        remainingAmount: true,
        currency: true,
      },
      take: 2,
    }),
    prisma.recurringTransaction.findMany({
      where: {
        userId,
        status: "ACTIVE",
        nextDueDate: { gte: now, lte: monthEnd },
      },
      select: { id: true, name: true, nextDueDate: true, amount: true },
      take: 2,
    }),
    prisma.goal.findMany({
      where: {
        userId,
        status: "ACTIVE",
        deadline: { gte: now, lte: monthEnd },
      },
      select: {
        id: true,
        name: true,
        deadline: true,
        targetAmount: true,
        currency: true,
      },
      take: 2,
    }),
    prisma.notification.findMany({
      where: { userId, type: "REMINDER" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

    const reminders = reminderNotifications
    .map(toReminder)
    .filter((r): r is NonNullable<typeof r> => r !== null && r.active)
    .map((r) => ({
      id: `reminder-${r.id}`,
      title: r.title,
      date: r.scheduledAt,
      amount: undefined,
      currency,
      type: t("upcomingEvents.types.reminder"),
    }))
    .filter((r) => r.date.getTime() <= monthEnd.getTime());

  const events = [
    ...reminders,
    ...debts.map((d) => ({
      id: `debt-${d.id}`,
      title: d.name,
      date: d.dueDate as Date,
      amount: d.remainingAmount,
      currency: d.currency,
      type: t("upcomingEvents.types.debt"),
    })),
    ...recurring.map((r) => ({
      id: `rec-${r.id}`,
      title: r.name,
      date: r.nextDueDate as Date,
      amount: r.amount,
      currency,
      type: t("upcomingEvents.types.recurring"),
    })),
    ...goals.map((g) => ({
      id: `goal-${g.id}`,
      title: g.name,
      date: g.deadline as Date,
      amount: g.targetAmount,
      currency: g.currency,
      type: t("upcomingEvents.types.goal"),
    })),
  ]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3);

  if (events.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t("upcomingEvents.title")}</h2>
        <EmptyStateCard
          variant="sm"
          icon={Calendar}
          title={t("upcomingEvents.empty.title")}
          description={t("upcomingEvents.empty.description")}
          hint={t("upcomingEvents.empty.hint")}
          className="border-dashed"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{t("upcomingEvents.title")}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="flex items-center gap-3 rounded-lg border border-border p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{ev.title}</p>
              <p className="text-xs text-muted-foreground">
                {ev.type} ·{" "}
                {fmtDate(ev.date, locale, { month: "short", day: "numeric" })}
                {ev.amount !== undefined &&
                  ` · ${formatCurrency(decimalToNumber(ev.amount), ev.currency || currency, locale)}`}
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

  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.home" });

  const profile = await getUserProfile();
  const scope = (profile?.scope ?? "PERSONAL") as UserScope;

  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const streakDays = profile?.streakDays ?? 0;

  const healthScores = await getHealthScores(profile?.id, org.id, scope);

  const indicatorsData = await fetchEconomicIndicators();

  const txCount = await getPrisma().transaction.count({ where: { organizationId: org.id } });

  const metadata = (profile?.metadata ?? {}) as {
    widgets?: WidgetLayoutItem[];
  };
  const initialLayout = mergeLayouts(metadata.widgets);

  const widgets: DashboardWidget[] = [
    {
      id: "daily-briefing",
      label: t("widgets.dailyBriefing"),
      content:
        scope === "PERSONAL" || scope === "BOTH" ? (
          <DailyBriefing
            userId={profile?.id}
            currency={org.currency}
            name={profile?.name}
            timezone={org.timezone}
          />
        ) : null,
    },
    {
      id: "xp-bar",
      label: t("widgets.xpBar"),
      content: <XPBar level={level} xp={xp} streakDays={streakDays} />,
    },
    {
      id: "health-score",
      label: t("widgets.healthScore"),
      content:
        scope === "PERSONAL" || scope === "BOTH" ? (
          <HealthScore result={healthScores} />
        ) : null,
    },
    {
      id: "kpi-grid",
      label: t("widgets.kpis"),
      content: (
        <Suspense fallback={<KpiGridLoading />}>
          <KpiGrid
            scope={scope}
            orgId={org.id}
            userId={profile?.id}
            currency={org.currency}
          />
        </Suspense>
      ),
    },
    {
      id: "ai-copilot",
      label: t("widgets.aiCopilot"),
      content:
        scope === "PERSONAL" || scope === "BOTH" ? (
          <Suspense fallback={<WidgetLoading />}>
            <AiCopilot currency={org.currency} />
          </Suspense>
        ) : null,
    },
    {
      id: "anomalies",
      label: t("widgets.anomalies"),
      content: <Anomalies />,
    },
    {
      id: "left-widget",
      label: t("widgets.transactions"),
      content: (
        <Suspense fallback={<WidgetLoading />}>
          <LeftWidget
            scope={scope}
            orgId={org.id}
            userId={profile?.id}
            currency={org.currency}
          />
        </Suspense>
      ),
    },
    {
      id: "right-widget",
      label: t("widgets.budgets"),
      content: (
        <Suspense fallback={<WidgetLoading />}>
          <RightWidget
            scope={scope}
            orgId={org.id}
            userId={profile?.id}
            currency={org.currency}
          />
        </Suspense>
      ),
    },
    {
      id: "ant-expenses",
      label: t("widgets.antExpenses"),
      content: <AntExpenses />,
    },
    {
      id: "recent-events",
      label: t("widgets.upcomingEvents"),
      content: (
        <Suspense fallback={<WidgetLoading />}>
          <UpcomingEvents userId={profile?.id} currency={org.currency} locale={locale} />
        </Suspense>
      ),
    },
    {
      id: "upcoming-bills",
      label: t("widgets.upcomingBills"),
      content: (
        <Suspense fallback={<WidgetLoading />}>
          <UpcomingBillsCard userId={profile?.id ?? ""} orgId={org?.id ?? null} />
        </Suspense>
      ),
    },
    {
      id: "economic-indicators",
      label: t("widgets.economicIndicators"),
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
      {txCount === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-6 text-center sm:flex-row sm:text-left">
          <div className="flex-1">
            <h2 className="text-base font-semibold">{t("empty.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("empty.description")}
            </p>
          </div>
          <SeedDemoButton />
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScopeBadge scope={scope} locale={locale} />
          <Link href="/dashboard/advisor">
            <Button variant="outline" className="h-10 gap-2">
              <Brain className="h-4 w-4" aria-hidden="true" />
              {t("advisor")}
            </Button>
          </Link>
        </div>
      </div>

      <AiInsightsCard
        userId={profile?.id}
        orgId={org.id}
        currency={org.currency}
        scope={scope}
      />

      <Suspense fallback={<WidgetLoading />}>
        <SmartInsights currency={org.currency} />
      </Suspense>

      {canAccessBusiness(scope) && (
        <div className="space-y-6">
          <Suspense fallback={<BusinessKpiGridLoading />}>
            <BusinessKpiGrid orgId={org.id} currency={org.currency} />
          </Suspense>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <QuickActionsCard className="lg:col-span-1" />
            <Suspense fallback={<WidgetLoading />}>
              <RevenueMiniChart
                orgId={org.id}
                currency={org.currency}
                className="lg:col-span-2"
              />
            </Suspense>
          </div>
          <Suspense fallback={<WidgetLoading />}>
            <RecentInvoicesCard orgId={org.id} currency={org.currency} />
          </Suspense>
        </div>
      )}

      <DraggableDashboard initialLayout={initialLayout} widgets={widgets} />
    </div>
  );
}
