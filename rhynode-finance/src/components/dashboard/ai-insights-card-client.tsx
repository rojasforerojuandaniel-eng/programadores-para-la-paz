"use client";

import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { cn } from "@/lib/utils";
import {
  FinancialInsightsSchema,
  type FinancialInsights,
} from "@/lib/ai-financial-insights-schema";
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  PiggyBank,
  Lightbulb,
  HeartPulse,
  AlertTriangle,
} from "lucide-react";

interface AiInsightsCardClientProps {
  initialInsights: FinancialInsights | null;
  currency: string;
}

const healthConfig = {
  saludable: {
    label: "Saludable",
    color: "text-emerald-700",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/20",
  },
  alerta: {
    label: "Alerta",
    color: "text-amber-800",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/20",
  },
  crítica: {
    label: "Crítica",
    color: "text-red-700",
    bg: "bg-red-500/10",
    ring: "ring-red-500/20",
  },
};

const trendConfig = {
  up: {
    icon: TrendingUp,
    label: "Mejorando",
    color: "text-emerald-700",
    bg: "bg-emerald-500/10",
  },
  down: {
    icon: TrendingDown,
    label: "Bajando",
    color: "text-red-700",
    bg: "bg-red-500/10",
  },
  stable: {
    icon: Minus,
    label: "Estable",
    color: "text-slate-700",
    bg: "bg-muted",
  },
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function isEmptyState(insights: FinancialInsights): boolean {
  return (
    insights.topCategory === null &&
    insights.savingsRate === 0 &&
    insights.financialHealth === "alerta" &&
    insights.recommendations.length <= 1
  );
}

export function AiInsightsCardClient({
  initialInsights,
  currency,
}: AiInsightsCardClientProps) {
  const [insights, setInsights] = useState<FinancialInsights | null>(initialInsights);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/financial-insights", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${response.status}`);
      }
      const raw = await response.json();
      const validated = FinancialInsightsSchema.parse(raw);
      setInsights(validated);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudieron actualizar los insights";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  if (error || insights === null) {
    return (
      <Card role="alert" className="surface-elevated-2 rounded-xl border-border">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-medium">No pudimos cargar los insights</p>
              <p className="text-sm text-slate-700">
                {error ?? "Ocurrió un problema al analizar tus finanzas."}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void fetchInsights()}
                aria-label="Reintentar cargar insights"
              >
                Reintentar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEmptyState(insights)) {
    return (
      <EmptyStateCard
        variant="sm"
        icon={PiggyBank}
        title="Aún no hay insights de IA"
        description="Registra ingresos y gastos para que Rhynode genere recomendaciones personalizadas."
        className="surface-elevated-2 rounded-xl border-border"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchInsights()}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Analizando…
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Actualizar
              </>
            )}
          </Button>
        }
      />
    );
  }

  const health = healthConfig[insights.financialHealth];
  const trend = trendConfig[insights.trend];
  const TrendIcon = trend.icon;
  const topRecommendation = insights.recommendations[0] ?? "";

  return (
    <section aria-labelledby="ai-insights-title">
      <Card className="surface-elevated-2 rounded-xl border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle
              id="ai-insights-title"
              className="heading-card flex items-center gap-2 text-base"
            >
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              Insights de IA
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={loading}
              onClick={() => void fetchInsights()}
              aria-label={loading ? "Analizando insights" : "Actualizar insights"}
            >
              <RefreshCw
                className={cn("h-4 w-4", loading && "animate-spin")}
                aria-hidden="true"
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div aria-live="polite" className="sr-only">
            {loading ? "Analizando tus finanzas…" : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border p-3 ring-1",
                health.bg,
                health.ring
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  health.bg
                )}
              >
                <HeartPulse
                  className={cn("h-5 w-5", health.color)}
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-xs text-slate-700">Salud financiera</p>
                <Badge
                  variant="outline"
                  className={cn("font-semibold", health.color)}
                >
                  {health.label}
                </Badge>
              </div>
            </div>

            <div className="min-w-0 flex-1 rounded-xl border border-border bg-muted/40 p-3">
              <div className="flex items-start gap-2">
                <Lightbulb
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium">Recomendación top</p>
                  <p className="text-xs leading-relaxed text-slate-700">
                    {topRecommendation}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  trend.bg
                )}
              >
                <TrendIcon
                  className={cn("h-4 w-4", trend.color)}
                  aria-hidden="true"
                />
              </div>
              <dl className="min-w-0">
                <dt className="text-xs text-slate-700">Mayor gasto del mes</dt>
                {insights.topCategory ? (
                  <>
                    <dd className="truncate font-semibold text-foreground">
                      {insights.topCategory.name}
                    </dd>
                    <dd className="text-sm text-slate-700">
                      {formatCurrency(insights.topCategory.amount, currency)}
                    </dd>
                  </>
                ) : (
                  <dd className="text-sm text-slate-700">Sin gastos registrados</dd>
                )}
              </dl>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <PiggyBank className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <dl>
                <dt className="text-xs text-slate-700">Ahorro sugerido</dt>
                <dd className="font-semibold text-foreground">
                  {insights.savingsRate.toFixed(0)}%
                </dd>
                <dd className="text-xs text-slate-700">de tus ingresos</dd>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
