"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Anomaly {
  category: string;
  increasePercent: number;
  severity: "low" | "medium" | "high";
}

interface AnomaliesResponse {
  anomalies: Anomaly[];
}

export function Anomalies() {
  const [data, setData] = useState<AnomaliesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnomalies() {
      try {
        const res = await fetch("/api/ai/anomalies");
        if (!res.ok) throw new Error("Error al cargar anomalías");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    fetchAnomalies();
  }, []);

  if (loading) {
    return (
      <div className="surface-elevated-2 rounded-xl border border-border p-4">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="surface-elevated-2 rounded-xl border border-border p-4">
        <p className="text-sm text-muted-foreground">No pudimos cargar las anomalías.</p>
      </div>
    );
  }
  if (data.anomalies.length === 0) {
    return <AnomaliesEmptyState />;
  }

  return (
    <div className="mb-6 rounded-xl border border-yellow-400/20 bg-yellow-400/10 p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-yellow-400" />
        <h3 className="text-sm font-semibold text-yellow-400">Anomalías detectadas</h3>
      </div>
      <div className="space-y-2">
        {data.anomalies.map((anomaly) => (
          <div
            key={anomaly.category}
            className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{anomaly.category}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                +{(anomaly.increasePercent ?? 0).toFixed(0)}%
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  anomaly.severity === "high"
                    ? "border-red-400 text-red-400"
                    : anomaly.severity === "medium"
                    ? "border-yellow-400 text-yellow-400"
                    : "border-green-400 text-green-400"
                )}
              >
                {anomaly.severity === "high" ? "Alta" : anomaly.severity === "medium" ? "Media" : "Baja"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnomaliesEmptyState() {
  return (
    <EmptyStateCard
      variant="sm"
      className="mb-6 border-dashed"
      icon={ShieldCheck}
      title="Todo en orden"
      description="No detectamos anomalías este mes."
    />
  );
}
