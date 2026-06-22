"use client";

import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, PiggyBank, AlertTriangle, Trash2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency as formatCurrencyLocale } from "@/lib/format";
import {
  formatPercentage,
  calculateScenarioProjection,
  type Scenario,
  type ScenarioSummary,
} from "@/lib/scenarios";
import type { Locale } from "@/lib/locale";

interface ScenarioCardProps {
  scenario: Scenario;
  summary: ScenarioSummary;
  onDelete: (id: string) => void;
  onSimulate: (scenario: Scenario) => void;
  isDeleting?: boolean;
}

export function ScenarioCard({
  scenario,
  summary,
  onDelete,
  onSimulate,
  isDeleting = false,
}: ScenarioCardProps) {
  const t = useTranslations("dashboard.scenarios");
  const locale = useLocale() as Locale;
  const formatCurrency = (amount: number, currency: string) =>
    formatCurrencyLocale(amount, currency, locale);
  const result = calculateScenarioProjection(scenario, summary);
  const variantStyles = {
    optimistic: {
      border: "border-emerald-500/20",
      bg: "bg-emerald-500/10",
      text: "text-emerald-600",
      iconColor: "text-emerald-500",
      badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
    },
    base: {
      border: "border-primary/20",
      bg: "bg-primary/10",
      text: "text-primary",
      iconColor: "text-primary",
      badge: "border-primary/20 bg-primary/10 text-primary",
    },
    pessimistic: {
      border: "border-rose-500/20",
      bg: "bg-rose-500/10",
      text: "text-rose-600",
      iconColor: "text-rose-500",
      badge: "border-rose-500/20 bg-rose-500/10 text-rose-600",
    },
  }[scenario.type];

  const Icon =
    scenario.type === "optimistic"
      ? TrendingUp
      : scenario.type === "pessimistic"
        ? AlertTriangle
        : PiggyBank;

  const breakEvenText = result.breakEvenMonth
    ? t("card.monthPrefix", { month: result.breakEvenMonth })
    : t("card.noBreakEvenLong");

  const deltaPositive = result.deltaVsBaseline >= 0;

  return (
    <Card
      className={cn(
        "surface-elevated-2 rounded-xl border-border",
        variantStyles.border
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="heading-card truncate text-base">
              {scenario.name}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("card.months", { count: scenario.durationMonths })} · {t("card.income")}{" "}
              {formatPercentage(scenario.incomeAdjustment)} · {t("card.expenses")}{" "}
              {formatPercentage(scenario.expenseAdjustment)}
            </p>
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              variantStyles.bg,
              variantStyles.iconColor
            )}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={variantStyles.badge}>
            {t(`types.${scenario.type}` as never)}
          </Badge>
          {result.breakEvenMonth && (
            <Badge
              variant="outline"
              className="border-rose-500/20 bg-rose-500/10 text-rose-600"
            >
              {t("card.breakEvenMonth", { month: result.breakEvenMonth })}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{t("card.finalBalance")}</p>
            <p
              className={cn(
                "text-sm font-semibold sm:text-base",
                result.finalBalance >= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {formatCurrency(result.finalBalance, summary.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("card.accumulatedSavings")}</p>
            <p className="text-sm font-semibold sm:text-base">
              {formatCurrency(result.totalSavings, summary.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("card.breakEvenPoint")}</p>
            <p className="text-sm font-medium">{breakEvenText}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("card.vsBaseline")}</p>
            <p
              className={cn(
                "text-sm font-semibold sm:text-base",
                deltaPositive ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {deltaPositive ? "+" : ""}
              {formatCurrency(result.deltaVsBaseline, summary.currency)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => onSimulate(scenario)}
          >
            <BarChart3 className="h-4 w-4" />
            {t("card.simulate")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-rose-600 hover:text-rose-700"
            onClick={() => onDelete(scenario.id)}
            disabled={isDeleting}
            aria-label={t("card.deleteAria", { name: scenario.name })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
