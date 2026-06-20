import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale, type Locale } from "@/lib/locale-server";
import { formatCurrency, formatDate as fmtDate, formatNumber } from "@/lib/format";
import {
  ArrowLeftRight,
  FileText,
  PiggyBank,
  Zap,
  Calendar,
  Trophy,
  Medal,
  ArrowRight,
  Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/decimal";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { XpBarChart } from "@/components/dashboard/xp-bar-chart";
import { ClientAvatar } from "@/components/dashboard/client-avatar";
import { LevelBadge } from "@/components/dashboard/level-badge";
import {
  startOfMonth,
  startOfWeek,
  endOfWeek,
  subWeeks,
  format,
  eachWeekOfInterval,
} from "date-fns";
import { es as esFns, enUS } from "date-fns/locale";

interface WeeklyXp {
  week: string;
  label: string;
  xp: number;
}

function getWeeklyXp(
  activities: { xpEarned: number; createdAt: Date }[],
  locale: Locale,
): WeeklyXp[] {
  const now = new Date();
  const start = startOfWeek(subWeeks(now, 7), { weekStartsOn: 1 });
  const weeks = eachWeekOfInterval(
    { start, end: startOfWeek(now, { weekStartsOn: 1 }) },
    { weekStartsOn: 1 }
  );
  const fnsLocale = locale === "en" ? enUS : esFns;

  return weeks.map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const xp = activities.reduce((sum, activity) => {
      const date = new Date(activity.createdAt);
      if (date >= weekStart && date <= weekEnd) {
        return sum + activity.xpEarned;
      }
      return sum;
    }, 0);

    return {
      week: format(weekStart, "yyyy-MM-dd"),
      label: format(weekStart, "d MMM", { locale: fnsLocale }),
      xp,
    };
  });
}

export default async function StatsPage() {
  const profile = await getUserProfile();
  if (!profile) {
    redirect("/sign-in");
  }

  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.stats" });

  const prisma = getPrisma();

  const now = new Date();
  const monthStart = startOfMonth(now);
  const eightWeeksAgo = startOfWeek(subWeeks(now, 7), { weekStartsOn: 1 });

  const [
    transactionsThisMonth,
    invoicesCount,
    goals,
    xpThisMonthAgg,
    recentActivities,
    recentAchievements,
  ] = await Promise.all([
    prisma.transaction.count({
      where: {
        userId: profile.id,
        date: { gte: monthStart },
      },
    }),
    prisma.invoice.count({
      where: {
        organization: { userId: profile.id },
        createdAt: { gte: monthStart },
      },
    }),
    prisma.goal.findMany({
      where: { userId: profile.id },
      select: { currentAmount: true },
    }),
    prisma.userActivity.aggregate({
      where: {
        userId: profile.id,
        createdAt: { gte: monthStart },
      },
      _sum: { xpEarned: true },
    }),
    prisma.userActivity.findMany({
      where: { userId: profile.id, createdAt: { gte: eightWeeksAgo } },
      select: { xpEarned: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.achievement.findMany({
      where: { userId: profile.id, unlockedAt: { not: null } },
      orderBy: { unlockedAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        xpAwarded: true,
        unlockedAt: true,
      },
    }),
  ]);

  const savings = goals.reduce(
    (sum, goal) => sum + decimalToNumber(goal.currentAmount),
    0
  );
  const xpThisMonth = xpThisMonthAgg._sum.xpEarned ?? 0;

  const activeDays = new Set(
    recentActivities.map((a) =>
      new Date(a.createdAt).toISOString().split("T")[0]
    )
  ).size;

  const weeklyXp = getWeeklyXp(recentActivities, locale);

  const kpis = [
    {
      label: t("kpis.txMonth"),
      value: transactionsThisMonth,
      icon: ArrowLeftRight,
    },
    {
      label: t("kpis.invMonth"),
      value: invoicesCount,
      icon: FileText,
    },
    {
      label: t("kpis.savings"),
      value: formatCurrency(savings, "COP", locale),
      icon: PiggyBank,
    },
    {
      label: t("kpis.xpMonth"),
      value: `${xpThisMonth} XP`,
      icon: Zap,
    },
    {
      label: t("kpis.activeDays"),
      value: activeDays,
      icon: Calendar,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">{t("subtitle")}</p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/dashboard/leaderboard">
            <Medal className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("leaderboard")}
          </Link>
        </Button>
      </div>

      <Card className="surface-elevated-2">
        <CardContent className="flex items-center gap-4 p-4 sm:p-5">
          <ClientAvatar name={profile.name ?? t("user")} className="h-14 w-14 text-base" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-foreground">
              {profile.name ?? t("user")}
            </p>
            <p className="text-sm text-muted-foreground">
              {profile.title ?? t("noTitle")}
            </p>
          </div>
          <div className="hidden text-right sm:block">
            <LevelBadge level={profile.level} />
            <p className="mt-1 text-xs text-muted-foreground">
              {formatNumber(profile.xp, locale)} XP
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
          />
        ))}
      </div>

      <Card className="surface-elevated-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" aria-hidden="true" />
            {t("xpPerWeek")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <XpBarChart data={weeklyXp} />
        </CardContent>
      </Card>

      <Card className="surface-elevated-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
            {t("recentAchievements")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAchievements.length === 0 ? (
            <EmptyStateCard
              variant="sm"
              icon={Trophy}
              title={t("empty.title")}
              description={t("empty.description")}
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/personal/achievements">
                    {t("viewAchievements")}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul role="list" aria-label={t("recentAchievements")} className="space-y-3">
              {recentAchievements.map((achievement) => (
                <li key={achievement.id}>
                  <div className="flex items-start gap-3 rounded-xl border border-border bg-card/50 p-3 transition-colors hover:bg-card">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Trophy className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">
                        {achievement.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {achievement.description}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 font-medium text-primary">
                          <Zap className="h-3 w-3" aria-hidden="true" />
                          {achievement.xpAwarded} XP
                        </span>
                        {achievement.unlockedAt && (
                          <span>
                            {fmtDate(achievement.unlockedAt, locale, { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
