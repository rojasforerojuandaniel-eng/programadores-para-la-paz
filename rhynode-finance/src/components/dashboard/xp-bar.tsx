"use client";

import { useEffect, useRef, useState } from "react";
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

interface XPBarProps {
  level: number;
  xp: number;
  streakDays: number;
}

function getTierColor(level: number) {
  if (level >= 50) return "from-violet-500 to-fuchsia-600";
  if (level >= 25) return "from-amber-400 to-orange-500";
  if (level >= 10) return "from-sky-400 to-blue-500";
  if (level >= 5) return "from-emerald-400 to-teal-500";
  return "from-slate-400 to-slate-500";
}

function getTierLabel(level: number) {
  if (level >= 50) return "Leyenda";
  if (level >= 25) return "Experto";
  if (level >= 10) return "Avanzado";
  if (level >= 5) return "Intermedio";
  return "Principiante";
}

const SEGMENTS = 10;

export function XPBar({ level, xp, streakDays }: XPBarProps) {
  const xpForNext = xpToNextLevel(level, xp);
  const nextLevelTotal = totalXpForLevel(level + 1);
  const progress = levelProgressPercent(level, xp);
  const tierGradient = getTierColor(level);
  const tierLabel = getTierLabel(level);
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
              <span className="text-sm font-semibold">Nivel {level}</span>
              <span className="body-small text-muted-foreground">— {tierLabel}</span>
            </div>
            {streakDays > 0 && (
              <div className="flex items-center gap-1 text-sm font-medium text-orange-500">
                <Flame className="h-4 w-4 animate-flame-flicker" />
                <span>Streak {streakDays} días</span>
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
                {xp.toLocaleString("es-CO")} / {nextLevelTotal.toLocaleString("es-CO")} XP
              </p>
            </div>
          </TooltipTrigger>
        </div>
      </div>
      <TooltipContent side="bottom" sideOffset={8}>
        <div className="space-y-1">
          <p className="font-medium">Nivel {level} — {tierLabel}</p>
          <p className="text-muted-foreground">
            Faltan {<span className="font-semibold text-foreground">
              {xpForNext.toLocaleString("es-CO")} XP
            </span>} para alcanzar el nivel {level + 1}.
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
