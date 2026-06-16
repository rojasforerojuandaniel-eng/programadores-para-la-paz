"use client";

import { Flame, Zap } from "lucide-react";

interface XPBarProps {
  level: number;
  xp: number;
  nextLevelXp: number;
  streakDays: number;
}

export function XPBar({ level, xp, nextLevelXp, streakDays }: XPBarProps) {
  const progress = nextLevelXp > 0 ? Math.min((xp / nextLevelXp) * 100, 100) : 0;
  const title = level < 5 ? "Novato" : "Experto";

  return (
    <div className="surface-elevated-2 flex items-center gap-4 rounded-xl border border-border p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Zap className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Nivel {level}</span>
            <span className="body-small text-muted-foreground">— {title}</span>
          </div>
          {streakDays > 0 && (
            <div className="flex items-center gap-1 text-sm font-medium text-orange-400">
              <Flame className="h-4 w-4" />
              <span>Streak {streakDays} días</span>
            </div>
          )}
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="body-small mt-1 text-right text-muted-foreground">
          {xp} / {nextLevelXp} XP
        </p>
      </div>
    </div>
  );
}
