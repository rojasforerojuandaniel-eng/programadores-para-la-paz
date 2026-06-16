import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { KpiSparkline } from "./kpi-sparkline";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  trend?: number[];
  delta?: number;
  deltaLabel?: string;
  footer?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

function formatDelta(delta: number) {
  if (!Number.isFinite(delta)) return "—";
  const sign = delta >= 0 ? "+" : "-";
  return `${sign}${Math.abs(delta).toFixed(1)}%`;
}

function sparklineIsPositive(trend: number[]) {
  if (trend.length < 2) return true;
  return trend[trend.length - 1] >= trend[0];
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  delta,
  deltaLabel,
  footer,
  className,
  valueClassName,
}: KpiCardProps) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const hasTrend = trend && trend.length > 0;
  const positive = hasDelta
    ? delta >= 0
    : hasTrend
      ? sparklineIsPositive(trend)
      : true;

  return (
    <Card className={cn("surface-elevated-2 rounded-xl border-border", className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground sm:text-base">{label}</p>
            <div
              className={cn(
                "mt-1 text-xl font-bold tracking-tight text-foreground sm:mt-2 sm:text-2xl",
                valueClassName
              )}
            >
              {value}
            </div>
            {(hasDelta || footer || hasTrend) && (
              <div className="mt-2 space-y-2">
                {(hasDelta || footer) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {hasDelta && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-medium",
                          positive
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                            : "border-rose-500/20 bg-rose-500/10 text-rose-600"
                        )}
                      >
                        {formatDelta(delta)}
                      </Badge>
                    )}
                    {deltaLabel && (
                      <span className="text-xs text-muted-foreground">{deltaLabel}</span>
                    )}
                    {footer}
                  </div>
                )}
                {hasTrend && (
                  <KpiSparkline data={trend} positive={positive} label={label} />
                )}
              </div>
            )}
          </div>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-11 sm:w-11"
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
