import { getPrisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/decimal";
import { generatePersonalInsights, type Nudge } from "@/lib/ai-insights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale, type Locale } from "@/lib/locale-server";
import { formatCurrency, formatDate as fmtDate } from "@/lib/format";
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Target,
  Lightbulb,
  Sunrise,
  Sun,
  Sunset,
  Moon,
} from "lucide-react";

interface DailyBriefingProps {
  userId: string | undefined;
  currency: string;
  name?: string | null;
  timezone?: string;
}

interface BriefingItem {
  id: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  subvalue?: string;
  href: string;
}

const DEFAULT_TIMEZONE = "America/Bogota";

function getLocalHour(timezone: string): number {
  const hourStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: timezone || DEFAULT_TIMEZONE,
  }).format(new Date());
  return Number.parseInt(hourStr, 10) || 0;
}

function getGreetingParts(
  hour: number,
  t: (key: string) => string,
): { text: string; Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> } {
  if (hour < 6) return { text: t("briefing.greeting.night"), Icon: Moon };
  if (hour < 12) return { text: t("briefing.greeting.morning"), Icon: Sunrise };
  if (hour < 18) return { text: t("briefing.greeting.afternoon"), Icon: Sun };
  return { text: t("briefing.greeting.night"), Icon: Sunset };
}

function getDayBounds(offsetDays: number, now: Date) {
  const date = now.getUTCDate() + offsetDays;
  return {
    start: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), date, 0, 0, 0),
    ),
    end: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), date, 23, 59, 59, 999),
    ),
  };
}

function getMonthRange(now: Date) {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)),
    end: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    ),
  };
}

async function fetchBriefingData(userId: string, currency: string, now: Date, locale: Locale) {
  const prisma = getPrisma();
  const { start: monthStart, end: monthEnd } = getMonthRange(now);
  const { start: yesterdayStart, end: yesterdayEnd } = getDayBounds(-1, now);
  const { start: todayStart, end: todayEnd } = getDayBounds(0, now);
  const weekAgo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7, 0, 0, 0),
  );

  const [
    accounts,
    yesterdayExpenses,
    weekExpenses,
    incomeAgg,
    dueDebts,
    dueRecurring,
    nearestGoal,
    insights,
  ] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      select: { balance: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: yesterdayStart, lte: yesterdayEnd },
      },
      select: { amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: weekAgo, lte: yesterdayEnd },
      },
      select: { amount: true, date: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "INCOME",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.debt.count({
      where: {
        userId,
        status: "ACTIVE",
        dueDate: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.recurringTransaction.count({
      where: {
        userId,
        status: "ACTIVE",
        nextDueDate: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.goal.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: [{ deadline: "asc" }, { targetAmount: "asc" }],
      select: {
        id: true,
        name: true,
        targetAmount: true,
        currentAmount: true,
        currency: true,
        deadline: true,
      },
    }),
    generatePersonalInsights(userId, currency, locale),
  ]);

  const balanceTotal = accounts.reduce(
    (sum, account) => sum + decimalToNumber(account.balance),
    0,
  );
  const yesterdayTotal = yesterdayExpenses.reduce(
    (sum, transaction) => sum + decimalToNumber(transaction.amount),
    0,
  );

  const dailyTotals = new Map<number, number>();
  for (const transaction of weekExpenses) {
    const day = new Date(transaction.date).getUTCDate();
    dailyTotals.set(
      day,
      (dailyTotals.get(day) ?? 0) + decimalToNumber(transaction.amount),
    );
  }
  const avgDaily =
    dailyTotals.size > 0
      ? Array.from(dailyTotals.values()).reduce((a, b) => a + b, 0) /
        dailyTotals.size
      : 0;

  const incomeMonth = decimalToNumber(incomeAgg._sum.amount);
  const dueToday = dueDebts + dueRecurring;
  const topInsight: Nudge | null = insights[0] ?? null;

  return {
    balanceTotal,
    yesterdayTotal,
    avgDaily,
    incomeMonth,
    dueToday,
    nearestGoal,
    topInsight,
  };
}

function buildBriefingItems(
  balanceTotal: number,
  yesterdayTotal: number,
  avgDaily: number,
  incomeMonth: number,
  dueToday: number,
  nearestGoal: Awaited<ReturnType<typeof fetchBriefingData>>["nearestGoal"],
  topInsight: Nudge | null,
  currency: string,
  locale: Locale,
  t: (key: string, vars?: Record<string, string | number>) => string,
): BriefingItem[] {
  return [
    {
      id: "balance",
      icon: Wallet,
      label: t("briefing.items.balance.label"),
      value: formatCurrency(balanceTotal, currency, locale),
      href: "/dashboard/personal/accounts",
    },
    {
      id: "yesterday",
      icon: ArrowDownRight,
      label:
        avgDaily > 0
          ? t("briefing.items.yesterday.labelWithAvg", {
              avg: formatCurrency(avgDaily, currency, locale),
            })
          : t("briefing.items.yesterday.label"),
      value: formatCurrency(yesterdayTotal, currency, locale),
      href: "/dashboard/transactions",
    },
    {
      id: "income",
      icon: ArrowUpRight,
      label: t("briefing.items.income.label"),
      value: formatCurrency(incomeMonth, currency, locale),
      href: "/dashboard/transactions",
    },
    {
      id: "due",
      icon: Calendar,
      label: t("briefing.items.due.label"),
      value:
        dueToday === 0
          ? t("briefing.items.due.none")
          : dueToday === 1
            ? t("briefing.items.due.singular", { n: dueToday })
            : t("briefing.items.due.plural", { n: dueToday }),
      href: "/dashboard/personal/calendar",
    },
    {
      id: "goal",
      icon: Target,
      label: t("briefing.items.goal.label"),
      value: nearestGoal?.name ?? t("briefing.items.goal.none"),
      subvalue: nearestGoal
        ? t("briefing.items.goal.subvalue", {
            current: formatCurrency(
              decimalToNumber(nearestGoal.currentAmount),
              nearestGoal.currency || currency,
              locale,
            ),
            target: formatCurrency(
              decimalToNumber(nearestGoal.targetAmount),
              nearestGoal.currency || currency,
              locale,
            ),
          })
        : undefined,
      href: "/dashboard/personal/goals",
    },
    {
      id: "insight",
      icon: Lightbulb,
      label: t("briefing.items.insight.label"),
      value: topInsight?.title ?? t("briefing.items.insight.defaultTitle"),
      subvalue:
        topInsight?.description ?? t("briefing.items.insight.defaultDesc"),
      href: topInsight?.actionHref ?? "/dashboard/advisor",
    },
  ];
}

export async function DailyBriefing({
  userId,
  currency,
  name,
  timezone,
}: DailyBriefingProps) {
  if (!userId) return null;

  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.ai" });

  const now = new Date();
  const hour = getLocalHour(timezone ?? DEFAULT_TIMEZONE);
  const { text: greeting, Icon: GreetingIcon } = getGreetingParts(hour, t);
  const displayName = name?.trim() || "";

  const { balanceTotal, yesterdayTotal, avgDaily, incomeMonth, dueToday, nearestGoal, topInsight } =
    await fetchBriefingData(userId, currency, now, locale);

  const items = buildBriefingItems(
    balanceTotal,
    yesterdayTotal,
    avgDaily,
    incomeMonth,
    dueToday,
    nearestGoal,
    topInsight,
    currency,
    locale,
    t,
  );

  return (
    <Card
      role="region"
      aria-label={t("briefing.ariaLabel")}
      className="surface-elevated-2 rounded-xl border-border"
    >
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="heading-card flex items-center gap-2 text-base">
              <GreetingIcon className="h-5 w-5 text-primary" aria-hidden={true} />
              {greeting}
              {displayName ? `, ${displayName}` : null}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {fmtDate(now, locale, { weekday: "long", month: "short", day: "numeric" })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="self-start sm:self-auto"
          >
            <Link href="/dashboard/advisor">{t("briefing.advisorButton")}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card/50 p-4 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon
                    className="h-4 w-4 text-primary"
                    aria-hidden={true}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-0.5 font-semibold text-foreground">
                    {item.value}
                  </p>
                  {item.subvalue ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {item.subvalue}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}