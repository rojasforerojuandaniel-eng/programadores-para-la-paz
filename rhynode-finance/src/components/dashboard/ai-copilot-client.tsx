"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Bug,
  CreditCard,
  Target,
  PiggyBank,
  TrendingUp,
  Lightbulb,
  X,
  RefreshCw,
  Sparkles,
} from "lucide-react";

export type NudgeType = "warning" | "tip" | "positive";

export interface Nudge {
  id: string;
  type: NudgeType;
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  priority: number;
}

function NudgeIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "alert-triangle":
      return <AlertTriangle className={className} aria-hidden="true" />;
    case "bug":
      return <Bug className={className} aria-hidden="true" />;
    case "credit-card":
      return <CreditCard className={className} aria-hidden="true" />;
    case "target":
      return <Target className={className} aria-hidden="true" />;
    case "piggy-bank":
      return <PiggyBank className={className} aria-hidden="true" />;
    case "trending-up":
      return <TrendingUp className={className} aria-hidden="true" />;
    default:
      return <Lightbulb className={className} aria-hidden="true" />;
  }
}

export function AiCopilotClient({
  initialInsights,
}: {
  initialInsights: Nudge[];
}) {
  const t = useTranslations("dashboard.ai");
  const [nudges, setNudges] = useState<Nudge[]>(initialInsights);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/personal/preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (
          data &&
          typeof data === "object" &&
          "dismissedNudges" in data &&
          Array.isArray(data.dismissedNudges)
        ) {
          setDismissed(data.dismissedNudges as string[]);
        }
      })
      .catch(() => null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/personal/insights");
      if (!res.ok) throw new Error("Error al cargar insights");
      const data = await res.json();
      setNudges(Array.isArray(data.insights) ? (data.insights as Nudge[]) : []);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      fetch("/api/personal/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissedNudges: next }),
      }).catch(() => null);
      return next;
    });
  }, []);

  const visibleNudges = nudges
    .filter((n) => !dismissed.includes(n.id))
    .slice(0, 3);

  return (
    <Card className="surface-elevated-2 rounded-xl border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="heading-card flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            {t("copilot.title")}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={t("copilot.refreshAria")}
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw
              className={cn("h-4 w-4", loading && "animate-spin")}
              aria-hidden="true"
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : visibleNudges.length === 0 ? (
          <EmptyStateCard
            variant="sm"
            className="border-0 bg-transparent shadow-none"
            icon={PiggyBank}
            title={t("copilot.emptyTitle")}
            description={t("copilot.emptyDescription")}
          />
        ) : (
          <ul className="space-y-3">
            {visibleNudges.map((nudge) => (
              <NudgeItem
                key={nudge.id}
                nudge={nudge}
                onDismiss={handleDismiss}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function NudgeItem({
  nudge,
  onDismiss,
}: {
  nudge: Nudge;
  onDismiss: (id: string) => void;
}) {
  const t = useTranslations("dashboard.ai");
  const iconClass = cn(
    "h-5 w-5",
    nudge.type === "warning" && "text-amber-500",
    nudge.type === "tip" && "text-primary",
    nudge.type === "positive" && "text-emerald-500",
  );

  return (
    <li
      className={cn(
        "relative flex items-start gap-3 rounded-xl border p-4",
        nudge.type === "warning" && "border-amber-400/20 bg-amber-400/10",
        nudge.type === "tip" && "border-primary/20 bg-primary/10",
        nudge.type === "positive" && "border-emerald-400/20 bg-emerald-400/10",
      )}
    >
      <div className="mt-0.5 shrink-0">
        <NudgeIcon name={nudge.icon} className={iconClass} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{nudge.title}</p>
        <p className="text-sm text-muted-foreground">{nudge.description}</p>
        <div className="mt-2 flex items-center gap-3">
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <Link
              href={nudge.actionHref}
              className="inline-flex items-center gap-1"
            >
              {nudge.actionLabel}
            </Link>
          </Button>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={t("copilot.dismissAria", { title: nudge.title })}
        onClick={() => onDismiss(nudge.id)}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </li>
  );
}
