"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Bug, AlertTriangle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/lib/locale";

interface AntPattern {
  name: string;
  total: number;
  count: number;
  percentOfTotal: number;
}

interface AntExpensesResponse {
  patterns: AntPattern[];
  totalAnt: number;
  percentOfTotal: number;
}

export function AntExpenses() {
  const t = useTranslations("charts.antExpenses");
  const locale = useLocale() as Locale;
  const [data, setData] = useState<AntExpensesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAntExpenses() {
      try {
        const res = await fetch("/api/ai/ant-expenses");
        if (!res.ok) throw new Error(t("apiError"));
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("unknownError"));
      } finally {
        setLoading(false);
      }
    }
    fetchAntExpenses();
  }, [t]);

  if (loading) {
    return (
      <div className="surface-elevated-2 rounded-xl border border-border p-6">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="surface-elevated-2 rounded-xl border border-border p-6">
        <p className="text-sm text-muted-foreground">{t("loadError")}</p>
      </div>
    );
  }

  return (
    <div className="surface-elevated-2 rounded-xl border border-border p-6">
      <div className="mb-4 flex items-center gap-2">
        <Bug className="h-5 w-5 text-primary" />
        <h3 className="heading-card text-base">{t("title")}</h3>
      </div>

      {data.patterns.length === 0 ? (
        <p className="body-small text-muted-foreground">{t("noPatterns")}</p>
      ) : (
        <div className="space-y-3">
          {data.patterns.map((pattern) => {
            const isHigh = pattern.percentOfTotal > 10;
            const isVeryHigh = pattern.percentOfTotal > 20;
            return (
              <div key={pattern.name} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  {isVeryHigh ? (
                    <AlertCircle className={cn("h-4 w-4 shrink-0", "text-red-400")} />
                  ) : isHigh ? (
                    <AlertTriangle className={cn("h-4 w-4 shrink-0", "text-yellow-400")} />
                  ) : (
                    <Bug className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">{pattern.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {t("countTimes", {
                      count: pattern.count,
                      amount: formatCurrency(pattern.total, "COP", locale),
                    })}
                  </span>
                  <Badge
                    variant={isVeryHigh ? "destructive" : isHigh ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {(pattern.percentOfTotal ?? 0).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-medium">{t("totalLabel")}</span>
            <span className="text-sm font-semibold text-primary">
              {formatCurrency(data.totalAnt ?? 0, "COP", locale)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
