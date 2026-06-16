"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
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

  if (loading) return null;
  if (error || !data) return null;
  if (data.anomalies.length === 0) return null;

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
    <div className="mb-6 rounded-xl border border-border surface-elevated-2 p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-400" />
        <span className="text-sm font-medium text-emerald-400">Todo en orden</span>
      </div>
      <p className="body-small mt-1">No detectamos anomalías este mes.</p>
    </div>
  );
}
