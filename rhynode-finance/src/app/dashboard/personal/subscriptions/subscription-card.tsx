"use client";

import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowUp, AlertTriangle, Ban, Clock, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/locale";
import { formatCurrency, formatDate as fmtDate } from "@/lib/format";
import type { SubscriptionItem } from "./subscription-utils";
import { monthlyEquivalent } from "./subscription-utils";
import { SubscriptionActions } from "./subscription-actions";

interface SubscriptionCardProps {
  item: SubscriptionItem;
  onUpdate: (item: SubscriptionItem) => void;
  onDelete: (id: string) => void;
}

export function SubscriptionCard({
  item,
  onUpdate,
  onDelete,
}: SubscriptionCardProps) {
  const t = useTranslations("dashboard.subscriptions");
  const locale = useLocale() as Locale;
  const isMarkedForCancel = item.status === "PENDING_CANCELLATION";

  return (
    <Card
      className={cn(
        "surface-elevated-2 rounded-xl border-border transition-opacity",
        isMarkedForCancel && "opacity-80"
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("font-semibold", isMarkedForCancel && "line-through decoration-muted-foreground/50")}>
                {item.name}
              </span>
              {item.unused && (
                <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-500">
                  <AlertTriangle className="h-3 w-3" /> {t("unused")}
                </Badge>
              )}
              {item.increased && (
                <Badge variant="outline" className="gap-1 border-rose-500/30 text-rose-500">
                  <ArrowUp className="h-3 w-3" /> {t("increased")}
                </Badge>
              )}
              {isMarkedForCancel && (
                <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-500">
                  <Ban className="h-3 w-3" />
                  {t("filters.PENDING_CANCELLATION")}
                </Badge>
              )}
              {item.daysRemaining !== null && (
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1",
                    item.daysRemaining <= 3
                      ? "border-rose-500/30 text-rose-500"
                      : item.daysRemaining <= 7
                        ? "border-amber-500/30 text-amber-500"
                        : "border-emerald-500/30 text-emerald-500"
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {item.daysRemaining <= 0
                    ? item.daysRemaining === 0
                      ? t("expiresToday")
                      : t("expiredDaysAgo", { count: Math.abs(item.daysRemaining) })
                    : t("inDays", { count: item.daysRemaining })}
                </Badge>
              )}
              {item.matched && (
                <Badge variant="outline" className="gap-1 border-blue-500/30 text-blue-500">
                  <Receipt className="h-3 w-3" />
                  {t("matchedPayment")}
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {t(`frequencies.${item.frequency}` as never)}
              </Badge>
              {item.provider && (
                <span className="text-xs text-muted-foreground">{item.provider}</span>
              )}
            </div>
          </div>
          <SubscriptionActions item={item} onUpdate={onUpdate} onDelete={onDelete} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{t("columns.amount")}</p>
            <p className="text-lg font-bold tracking-tight">
              {formatCurrency(item.amount, item.currency, locale)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(monthlyEquivalent(item.amount, item.frequency), item.currency, locale)} {t("perMonth")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t("kpis.nextRenewal")}</p>
            <div className="flex items-center justify-end gap-1.5 text-sm font-medium">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              {item.nextRenewal
                ? fmtDate(item.nextRenewal, locale, { day: "numeric", month: "short", year: "numeric" })
                : "—"}
            </div>
            {item.lastPaidAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("lastPaid")}: {fmtDate(item.lastPaidAt, locale, { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
