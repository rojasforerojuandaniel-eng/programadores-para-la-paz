"use client";

import { useEffect, useState } from "react";
import { Bug, AlertTriangle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const [data, setData] = useState<AntExpensesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAntExpenses() {
      try {
        const res = await fetch("/api/ai/ant-expenses");
        if (!res.ok) throw new Error("Error al cargar gastos hormiga");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    fetchAntExpenses();
  }, []);

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
        <p className="text-sm text-muted-foreground">No pudimos cargar los gastos hormiga.</p>
      </div>
    );
  }

  return (
    <div className="surface-elevated-2 rounded-xl border border-border p-6">
      <div className="mb-4 flex items-center gap-2">
        <Bug className="h-5 w-5 text-primary" />
        <h3 className="heading-card text-base">Gastos Hormiga</h3>
      </div>

      {data.patterns.length === 0 ? (
        <p className="body-small text-muted-foreground">No detectamos patrones de gastos hormiga este mes.</p>
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
                    {pattern.count} x ${pattern.total.toLocaleString("es-CO")}
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
            <span className="text-sm font-medium">Total gastos hormiga</span>
            <span className="text-sm font-semibold text-primary">
              ${(data.totalAnt ?? 0).toLocaleString("es-CO")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
