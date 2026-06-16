"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Globe } from "lucide-react";

interface EconomicIndicator {
  id: string;
  name: string;
  value: string;
  unit: string;
  date: string;
  source: string;
  trend: "up" | "down" | "flat";
  previousValue: string;
}

const mockIndicators: EconomicIndicator[] = [
  {
    id: "trm",
    name: "TRM",
    value: "4,012.50",
    unit: "COP/USD",
    date: "2026-06-13",
    source: "Superfinanciera",
    trend: "up",
    previousValue: "3,985.20",
  },
  {
    id: "intervention",
    name: "Tasa de Intervención",
    value: "9.50",
    unit: "%",
    date: "2026-06-13",
    source: "Banco de la República",
    trend: "down",
    previousValue: "9.75",
  },
  {
    id: "ipc",
    name: "IPC (Inflación)",
    value: "4.82",
    unit: "% anual",
    date: "2026-05-31",
    source: "DANE",
    trend: "down",
    previousValue: "5.15",
  },
  {
    id: "dtf",
    name: "DTF",
    value: "9.35",
    unit: "% EA",
    date: "2026-06-13",
    source: "Banco de la República",
    trend: "flat",
    previousValue: "9.35",
  },
  {
    id: "uvr",
    name: "UVR",
    value: "342.15",
    unit: "COP",
    date: "2026-06-13",
    source: "Banco de la República",
    trend: "up",
    previousValue: "341.80",
  },
];

function TrendBadge({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up") {
    return (
      <Badge variant="outline" className="gap-1 text-emerald-600">
        <TrendingUp className="h-3 w-3" />
        Subió
      </Badge>
    );
  }
  if (trend === "down") {
    return (
      <Badge variant="outline" className="gap-1 text-rose-600">
        <TrendingDown className="h-3 w-3" />
        Bajó
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Minus className="h-3 w-3" />
      Sin cambio
    </Badge>
  );
}

export default function EconomicIndicatorsPage() {
  const [indicators, setIndicators] = useState<EconomicIndicator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular fetch de datos
    const timer = setTimeout(() => {
      setIndicators(mockIndicators);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-section">Indicadores Económicos</h1>
        <p className="body-default mt-1">Tasas de referencia y variables macroeconómicas de Colombia</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {indicators.map((ind) => (
            <Card key={ind.id} className="surface-elevated-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                  {ind.name}
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{ind.value}</span>
                  <span className="text-sm text-muted-foreground">{ind.unit}</span>
                </div>
                <div className="flex items-center gap-3">
                  <TrendBadge trend={ind.trend} />
                  <span className="text-xs text-muted-foreground">Anterior: {ind.previousValue}</span>
                </div>
                <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                  <span>{ind.source}</span>
                  <span>{ind.date}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
