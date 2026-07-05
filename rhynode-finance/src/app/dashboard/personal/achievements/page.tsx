"use client";

import * as React from "react";
import {
  Trophy,
  Star,
  Zap,
  TrendingUp,
  Target,
  PiggyBank,
  Wallet,
  Calendar,
  Award,
  Shield,
  Footprints,
  Calculator,
  FileText,
  Receipt,
  Flame,
  CalendarCheck,
  ShieldCheck,
  Coins,
  BookOpen,
  Briefcase,
  CheckCircle,
  Crown,
  Lock,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { useTranslations, useLocale } from "next-intl";
import { formatDate } from "@/lib/format";
import type { Locale } from "@/lib/locale";
import { cn } from "@/lib/utils";
import {
  useAchievements,
  type UnlockedAchievement,
  type PendingAchievement,
} from "@/hooks/use-dashboard-data";

const iconMap: Record<string, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  Trophy,
  Star,
  Zap,
  TrendingUp,
  Target,
  PiggyBank,
  Wallet,
  Calendar,
  Award,
  Shield,
  Footprints,
  Calculator,
  FileText,
  Receipt,
  Flame,
  CalendarCheck,
  ShieldCheck,
  Coins,
  BookOpen,
  Briefcase,
  CheckCircle,
  Crown,
};

const categoryConfig = {
  starter: { labelKey: "categories.starter" as const, color: "bg-sky-500/10 text-sky-700 border-sky-500/20" },
  consistency: { labelKey: "categories.consistency" as const, color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  advanced: { labelKey: "categories.advanced" as const, color: "bg-violet-500/10 text-violet-700 border-violet-500/20" },
};

function getIcon(name: string, iconKey?: string | null) {
  if (iconKey && iconMap[iconKey]) return iconMap[iconKey];
  const key = Object.keys(iconMap).find((k) =>
    name.toLowerCase().includes(k.toLowerCase())
  );
  return iconMap[key || "Trophy"] || Trophy;
}

function AchievementIcon({
  name,
  iconKey,
  className,
}: {
  name: string;
  iconKey?: string | null;
  className?: string;
}) {
  return React.createElement(getIcon(name, iconKey), { className, "aria-hidden": true });
}

function CircularProgress({
  percentage,
  unlocked,
  className,
}: {
  percentage: number;
  unlocked: boolean;
  className?: string;
}) {
  const radius = 20;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div className={cn("relative flex h-12 w-12 shrink-0 items-center justify-center", className)}>
      <svg height={radius * 2} width={radius * 2} className="-rotate-90" aria-hidden="true">
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="text-muted"
        />
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{
            strokeDashoffset: offset,
            transition: "stroke-dashoffset 0.8s ease-out",
          }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className={cn(
            "text-primary",
            unlocked && "text-emerald-500"
          )}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {unlocked ? (
          <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
        ) : (
          <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

function UnlockCelebration() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {[
        { tx: "-24px", ty: "-28px", delay: "0ms", color: "bg-amber-400" },
        { tx: "24px", ty: "-26px", delay: "60ms", color: "bg-yellow-300" },
        { tx: "-18px", ty: "24px", delay: "120ms", color: "bg-emerald-400" },
        { tx: "20px", ty: "22px", delay: "180ms", color: "bg-sky-400" },
        { tx: "0px", ty: "-32px", delay: "90ms", color: "bg-primary" },
      ].map((particle, i) => (
        <span
          key={i}
          className={cn(
            "absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full animate-sparkle",
            particle.color
          )}
          style={{
            ["--tx" as string]: particle.tx,
            ["--ty" as string]: particle.ty,
            animationDelay: particle.delay,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function AchievementCard({
  achievement,
  unlocked,
}: {
  achievement: UnlockedAchievement | PendingAchievement;
  unlocked: boolean;
}) {
  const category = "category" in achievement ? achievement.category : undefined;
  const categoryStyle = category ? categoryConfig[category] : null;
  const t = useTranslations("dashboard.achievements");
  const locale = useLocale() as Locale;

  return (
    <Card
      className={cn(
        "surface-elevated-2 relative overflow-hidden rounded-xl border-border transition-all hover:shadow-md",
        unlocked
          ? "border-l-4 border-l-primary"
          : "grayscale-[0.15]"
      )}
    >
      {unlocked && <UnlockCelebration />}
      <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform",
              unlocked ? "bg-primary/10" : "bg-muted",
              unlocked && "animate-achievement-pop"
            )}
          >
            <AchievementIcon
              name={achievement.name}
              iconKey={"icon" in achievement ? achievement.icon : undefined}
              className={cn(
                "h-5 w-5",
                unlocked ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>
          <div className="flex min-w-0 flex-col items-end gap-2">
            <Badge variant={unlocked ? "default" : "secondary"}>
              {unlocked ? t("status.completed") : t("status.pending")}
            </Badge>
            <CircularProgress
              percentage={unlocked ? 100 : 0}
              unlocked={unlocked}
            />
          </div>
        </div>
        <div className="min-w-0">
          {categoryStyle && (
            <Badge
              variant="outline"
              className={cn("mb-2 text-xs", categoryStyle.color)}
            >
              {t(categoryStyle.labelKey)}
            </Badge>
          )}
          <p
            className={cn(
              "font-semibold",
              !unlocked && "text-muted-foreground"
            )}
          >
            {t(`achievements.${achievement.type}.name` as never)}
          </p>
          <p className="text-sm text-muted-foreground">
            {t(`achievements.${achievement.type}.description` as never)}
          </p>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span
            className={cn(
              "flex items-center gap-1 font-medium",
              unlocked ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            {achievement.xpAwarded} XP
          </span>
          {unlocked && "unlockedAt" in achievement && achievement.unlockedAt && (
            <span className="text-muted-foreground">
              {formatDate(achievement.unlockedAt, locale, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AchievementGrid({
  achievements,
  empty,
}: {
  achievements: (UnlockedAchievement | PendingAchievement)[];
  empty: React.ReactNode;
}) {
  if (achievements.length === 0) return empty;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {achievements.map((achievement) => (
        <AchievementCard
          key={achievement.type}
          achievement={achievement}
          unlocked={"unlockedAt" in achievement}
        />
      ))}
    </div>
  );
}

export default function AchievementsPage() {
  const t = useTranslations("dashboard.achievements");
  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useAchievements();

  const error = queryError ? (queryError instanceof Error ? queryError.message : t("errors.unknown")) : null;

  const { unlocked, pending, all } = React.useMemo(() => {
    const unlockedList = data?.unlocked ?? [];
    const pendingList = data?.pending ?? [];
    return {
      unlocked: unlockedList,
      pending: pendingList,
      all: [...unlockedList, ...pendingList],
    };
  }, [data]);

  const totalPossible = data?.stats.total ?? unlocked.length + pending.length;
  const totalXp = data?.stats.xpEarned ?? unlocked.reduce((s, a) => s + a.xpAwarded, 0);
  const progressPercentage = totalPossible > 0 ? Math.round((unlocked.length / totalPossible) * 100) : 0;

  const skeleton = (
    <div role="status" aria-live="polite" aria-busy="true" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">{t("loading")}</span>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );

  const errorState = (
    <EmptyStateCard
      variant="lg"
      icon={Trophy}
      title={t("errorState.title")}
      description={error ?? ""}
      hint={t("errorState.hint")}
    />
  );

  const emptyState = (
    <EmptyStateCard
      variant="lg"
      icon={Trophy}
      title={t("empty.title")}
      description={t("empty.description")}
      hint={t("empty.hint")}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="heading-section">{t("title")}</h1>
        <p className="body-default mt-1">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label={t("kpis.unlocked")}
          value={`${unlocked.length} / ${totalPossible}`}
          icon={Trophy}
        />
        <KpiCard label={t("kpis.xp")} value={`${totalXp} XP`} icon={Zap} />
        <KpiCard label={t("kpis.pending")} value={pending.length} icon={Target} />
      </div>

      <Card className="surface-elevated-2 rounded-xl border-border">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div id="achievements-progress-label" className="text-sm font-medium text-foreground">
              {t("progress.label")}
            </div>
            <div id="achievements-progress-percent" className="text-xs font-medium text-muted-foreground">
              {t("progress.summary", { unlocked: unlocked.length, total: totalPossible, pct: progressPercentage })}
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercentage}
              aria-labelledby="achievements-progress-label achievements-progress-percent"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList className="w-full min-h-11 sm:w-auto">
          <TabsTrigger value="all" className="flex-1 sm:flex-initial">
            {t("tabs.all")}
          </TabsTrigger>
          <TabsTrigger value="unlocked" className="flex-1 sm:flex-initial">
            {t("tabs.unlocked")}
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex-1 sm:flex-initial">
            {t("tabs.pending")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {loading ? skeleton : error ? errorState : <AchievementGrid achievements={all} empty={emptyState} />}
        </TabsContent>

        <TabsContent value="unlocked" className="mt-4">
          {loading ? (
            skeleton
          ) : error ? (
            errorState
          ) : unlocked.length > 0 ? (
            <AchievementGrid
              achievements={unlocked}
              empty={emptyState}
            />
          ) : (
            <EmptyStateCard
              variant="lg"
              icon={Trophy}
              title={t("unlockedEmpty.title")}
              description={t("unlockedEmpty.description")}
              hint={t("unlockedEmpty.hint")}
            />
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {loading ? (
            skeleton
          ) : error ? (
            errorState
          ) : pending.length > 0 ? (
            <AchievementGrid
              achievements={pending}
              empty={emptyState}
            />
          ) : (
            <EmptyStateCard
              variant="lg"
              icon={Award}
              title={t("allDone.title")}
              description={t("allDone.description")}
              hint={t("allDone.hint")}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
