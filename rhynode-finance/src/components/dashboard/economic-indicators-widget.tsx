import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Globe } from "lucide-react";
import type { EconomicIndicator } from "@/lib/economic-indicators";

interface EconomicIndicatorsWidgetProps {
  indicators: EconomicIndicator[];
  lastUpdated: string;
  attribution: string;
}

function TrendBadge({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up") {
    return (
      <Badge variant="outline" className="gap-1 text-xs text-emerald-600">
        <TrendingUp className="h-3 w-3" />
        Subió
      </Badge>
    );
  }
  if (trend === "down") {
    return (
      <Badge variant="outline" className="gap-1 text-xs text-rose-600">
        <TrendingDown className="h-3 w-3" />
        Bajó
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" />
      Estable
    </Badge>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function EconomicIndicatorsWidget({
  indicators,
  lastUpdated,
  attribution,
}: EconomicIndicatorsWidgetProps) {
  const displayIndicators = indicators.slice(0, 4);

  return (
    <Card className="feature-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="heading-card flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" />
            Indicadores Colombia
          </CardTitle>
          <TrendBadge trend="flat" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {displayIndicators.map((indicator) => (
            <div
              key={indicator.id}
              className="rounded-lg border bg-card/50 p-3 transition-colors hover:bg-muted/50"
            >
              <p className="text-xs text-muted-foreground">{indicator.name}</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">
                {indicator.value}
              </p>
              <p className="text-xs text-muted-foreground">{indicator.unit}</p>
              <div className="mt-2 flex items-center justify-between">
                <TrendBadge trend={indicator.trend} />
                <span className="text-xs text-muted-foreground">
                  {formatDate(indicator.date)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {attribution} · Actualizado {formatDate(lastUpdated)}
        </p>
      </CardContent>
    </Card>
  );
}
