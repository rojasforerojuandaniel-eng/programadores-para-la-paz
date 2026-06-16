"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
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

const DISMISS_KEY = "rhynode:dismissed-nudges";

function readDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify(ids));
  } catch {
    // ignore storage errors
  }
}

const dismissedStore = {
  listeners: new Set<() => void>(),
  subscribe(callback: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    this.listeners.add(callback);
    const storageHandler = (event: StorageEvent) => {
      if (event.key === DISMISS_KEY) callback();
    };
    window.addEventListener("storage", storageHandler);
    return () => {
      this.listeners.delete(callback);
      window.removeEventListener("storage", storageHandler);
    };
  },
  getSnapshot(): string[] {
    return readDismissed();
  },
  dismiss(id: string) {
    const current = readDismissed();
    if (current.includes(id)) return;
    const next = [...current, id];
    writeDismissed(next);
    this.listeners.forEach((cb) => cb());
  },
};

function useDismissedNudges(): string[] {
  return useSyncExternalStore(
    (callback) => dismissedStore.subscribe(callback),
    () => dismissedStore.getSnapshot(),
    () => []
  );
}

function NudgeIcon({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "alert-triangle":
      return <AlertTriangle className={className} />;
    case "bug":
      return <Bug className={className} />;
    case "credit-card":
      return <CreditCard className={className} />;
    case "target":
      return <Target className={className} />;
    case "piggy-bank":
      return <PiggyBank className={className} />;
    case "trending-up":
      return <TrendingUp className={className} />;
    default:
      return <Lightbulb className={className} />;
  }
}

export function AiCopilotClient({ initialInsights }: { initialInsights: Nudge[] }) {
  const [nudges, setNudges] = useState<Nudge[]>(initialInsights);
  const [loading, setLoading] = useState(false);
  const dismissed = useDismissedNudges();

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
    dismissedStore.dismiss(id);
  }, []);

  const visibleNudges = nudges.filter((n) => !dismissed.includes(n.id)).slice(0, 3);

  return (
    <Card className="surface-elevated-2 rounded-xl border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="heading-card flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            Copiloto financiero
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Refrescar insights"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
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
            title="Todo en orden"
            description="No hay alertas importantes ahora. Sigue registrando movimientos para recibir insights proactivos."
          />
        ) : (
          <ul className="space-y-3">
            {visibleNudges.map((nudge) => (
              <NudgeItem key={nudge.id} nudge={nudge} onDismiss={handleDismiss} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function NudgeItem({ nudge, onDismiss }: { nudge: Nudge; onDismiss: (id: string) => void }) {
  const iconClass = cn(
    "h-5 w-5",
    nudge.type === "warning" && "text-amber-500",
    nudge.type === "tip" && "text-primary",
    nudge.type === "positive" && "text-emerald-500"
  );

  return (
    <li
      className={cn(
        "relative flex items-start gap-3 rounded-xl border p-4",
        nudge.type === "warning" && "border-amber-400/20 bg-amber-400/10",
        nudge.type === "tip" && "border-primary/20 bg-primary/10",
        nudge.type === "positive" && "border-emerald-400/20 bg-emerald-400/10"
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
            <Link href={nudge.actionHref} className="inline-flex items-center gap-1">
              {nudge.actionLabel}
            </Link>
          </Button>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={`Ocultar ${nudge.title}`}
        onClick={() => onDismiss(nudge.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}
