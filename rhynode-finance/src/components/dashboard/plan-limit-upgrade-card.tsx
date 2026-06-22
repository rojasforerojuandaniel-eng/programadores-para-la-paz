"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Lock } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export interface PlanLimitUpgradeCardProps {
  planName: string;
  resource: "invoices" | "users";
  limit: number;
  current: number;
}

export function PlanLimitUpgradeCard({
  planName,
  resource,
  limit,
  current,
}: PlanLimitUpgradeCardProps) {
  const t = useTranslations("dashboard.common.planLimit");
  const resourceKey = `${resource}_${current === 1 ? "singular" : "plural"}` as const;
  const resourceLabel = t(`resources.${resourceKey}` as never);
  const resourcePlural = t(`resources.${resource}_plural` as never);
  const isOverLimit = limit !== Infinity && current >= limit;
  const progress = limit === Infinity ? 0 : Math.min(100, (current / limit) * 100);

  return (
    <Card
      role="region"
      aria-live="polite"
      aria-label={t("ariaLabel", { resource: resourcePlural, plan: planName })}
      className="surface-elevated-2 border-warning/20"
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle className="heading-card text-base">
              {t("title", { resource: resourcePlural })}
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary">
            {planName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <p className="body-default text-sm">
          {t("body", {
            current,
            limit: limit === Infinity ? "∞" : limit,
            resource: resourceLabel,
          })}
        </p>

        {limit !== Infinity && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("usage")}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              aria-hidden="true"
            >
              <div
                className={`h-full rounded-full transition-all ${
                  isOverLimit ? "bg-danger" : "bg-warning"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <Button asChild className="gap-2">
          <Link href="/dashboard/settings?tab=billing">
            {t("viewPlans")}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
