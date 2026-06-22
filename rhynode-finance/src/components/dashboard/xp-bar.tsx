"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Flame, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  xpToNextLevel,
  totalXpForLevel,
  levelProgressPercent,
} from "@/lib/levels";
import { formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/locale";

interface XPBarProps {
  level: number;
  xp: number;
  streakDays: number;
}

type TierKey = "leyenda" | "experto" | "avanzado" | "intermedio" | "principiante";

function getTierColor(level: number) {
  if (level >= 50) return "from-violet-500 to-fuchsia-600";
  if (level >= 25) return "from-amber-400 to-orange-500";
  if (level >= 10) return "from-sky-400 to-blue-500";
  if (level >= 5) return "from-emerald-400 to-teal-500";
  return "from-slate-400 to-slate-500";
}

function getTierKey(level: number): TierKey {
  if (level >= 50) return "leyenda";
  if (level >= 25) return "experto";
  if (level >= 10) return "avanzado";
  if (level >= 5) return "intermedio";
  return "principiante";
}

const SEGMENTS = 10;

export function XPBar({ level, xp, streakDays }: XPBarProps) {
  const t = useTranslations("dashboard.achievements.xpBar");
  const locale = useLocale() as Locale;
  const xpForNext = xpToNextLevel(level, xp);
  const nextLevelTotal = totalXpForLevel(level + 1);
  const progress = levelProgressPercent(level, xp);
  const tierGradient = getTierColor(level);
  const tierKey = getTierKey(level);
  const tierLabel = t(`tier.${tierKey}` as never);
  const filledSegments = Math.floor((progress / 100) * SEGMENTS);

  const [celebrating, setCelebrating] = useState(false);
  const previousLevel = useRef(level);

  useEffect(() => {
    if (previousLevel.current !== level) {
      setCelebrating(true);
      const timer = setTimeout(() => setCelebrating(false), 1200);
      previousLevel.current = level;
      return () => clearTimeout(timer);
    }
  }, [level]);

  return (
    <Tooltip>
      <div
        className={cn(
          "surface-elevated-2 flex items-center gap-4 rounded-xl border border-border p-4 transition-shadow",
          celebrating && "animate-level-up shadow-lg shadow-primary/20"
        )}
      >
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-sm",
            tierGradient,
            celebrating && "animate-level-up"
          )}
        >
          {celebrating ? (
            <Sparkles className="h-5 w-5" />
          ) : (
            <Zap className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{t("level", { level })}</span>
              <span className="body-small text-muted-foreground">{t("tierSeparator", { tier: tierLabel })}</span>
            </div>
            {streakDays > 0 && (
              <div className="flex items-center gap-1 text-sm font-medium text-orange-500">
                <Flame className="h-4 w-4 animate-flame-flicker" />
                <span>{t("streak", { days: streakDays })}</span>
              </div>
            )}
          </div>

          <TooltipTrigger asChild>
            <div className="mt-2">
              <div className="flex h-2.5 gap-0.5">
                {Array.from({ length: SEGMENTS }).map((_, i) => {
                  const filled = i < filledSegments;
                  const partial =
                    i === filledSegments && progress > 0 && progress < 100;
                  const width = partial
                    ? `${((progress / 100) * SEGMENTS - filledSegments) * 100}%`
                    : undefined;
                  return (
                    <div
                      key={i}
                      className="relative h-full flex-1 overflow-hidden rounded-sm bg-muted"
                    >
                      {(filled || partial) && (
                        <div
                          className={cn(
                            "absolute inset-y-0 left-0 rounded-sm bg-gradient-to-r",
                            tierGradient,
                            !partial && "animate-progress-fill"
                          )}
                          style={{ width: filled ? "100%" : width }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="body-small mt-1 text-right text-muted-foreground">
                {t("xpProgress", {
                  current: formatNumber(xp, locale),
                  total: formatNumber(nextLevelTotal, locale),
                })}
              </p>
            </div>
          </TooltipTrigger>
        </div>
      </div>
      <TooltipContent side="bottom" sideOffset={8}>
        <div className="space-y-1">
          <p className="font-medium">{t("tooltipLevel", { level, tier: tierLabel })}</p>
          <p className="text-muted-foreground">
            {t("tooltipRemaining", {
              xp: formatNumber(xpForNext, locale),
              nextLevel: level + 1,
            })}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
