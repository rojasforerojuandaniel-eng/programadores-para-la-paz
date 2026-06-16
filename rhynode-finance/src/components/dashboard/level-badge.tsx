"use client";

import { cn } from "@/lib/utils";

interface LevelBadgeProps {
  level: number;
  className?: string;
  showLabel?: boolean;
}

function getTierStyles(level: number) {
  if (level >= 50) {
    return {
      bg: "bg-gradient-to-br from-violet-500 to-fuchsia-600",
      ring: "ring-violet-300",
      text: "text-white",
      label: "Leyenda",
    };
  }
  if (level >= 25) {
    return {
      bg: "bg-gradient-to-br from-amber-400 to-orange-500",
      ring: "ring-amber-300",
      text: "text-white",
      label: "Experto",
    };
  }
  if (level >= 10) {
    return {
      bg: "bg-gradient-to-br from-sky-400 to-blue-500",
      ring: "ring-sky-300",
      text: "text-white",
      label: "Avanzado",
    };
  }
  if (level >= 5) {
    return {
      bg: "bg-gradient-to-br from-emerald-400 to-teal-500",
      ring: "ring-emerald-300",
      text: "text-white",
      label: "Intermedio",
    };
  }
  return {
    bg: "bg-gradient-to-br from-slate-400 to-slate-500",
    ring: "ring-slate-300",
    text: "text-white",
    label: "Principiante",
  };
}

export function LevelBadge({ level, className, showLabel = false }: LevelBadgeProps) {
  const styles = getTierStyles(level);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ring-2 ring-offset-2 ring-offset-background",
          styles.bg,
          styles.ring,
          styles.text
        )}
      >
        {level}
      </div>
      {showLabel && <span className="text-sm font-medium text-muted-foreground">{styles.label}</span>}
    </div>
  );
}
