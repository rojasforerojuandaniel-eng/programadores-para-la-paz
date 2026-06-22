"use client";

import { useTranslations, useLocale } from "next-intl";
import { TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, AlertTriangle, Ban, CalendarDays, Clock, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/locale";
import { formatCurrency, formatDate as fmtDate } from "@/lib/format";
import type { SubscriptionItem } from "./subscription-utils";
import { monthlyEquivalent } from "./subscription-utils";
import { SubscriptionActions } from "./subscription-actions";

interface SubscriptionRowProps {
  item: SubscriptionItem;
  onUpdate: (item: SubscriptionItem) => void;
  onDelete: (id: string) => void;
}

export function SubscriptionRow({
  item,
  onUpdate,
  onDelete,
}: SubscriptionRowProps) {
  const t = useTranslations("dashboard.subscriptions");
  const locale = useLocale() as Locale;
  const isMarkedForCancel = item.status === "PENDING_CANCELLATION";

  return (
    <>
      <TableCell className="py-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("font-medium", isMarkedForCancel && "line-through decoration-muted-foreground/50")}>
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
                <Ban className="h-3 w-3" /> {t("filters.PENDING_CANCELLATION")}
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
          {item.provider && (
            <span className="text-xs text-muted-foreground">{item.provider}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">
            {formatCurrency(item.amount, item.currency, locale)}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatCurrency(monthlyEquivalent(item.amount, item.frequency), item.currency, locale)} {t("perMonth")}
          </span>
        </div>
      </TableCell>
      <TableCell className="py-3">
        <Badge variant="outline" className="capitalize">
          {t(`frequencies.${item.frequency}` as never)}
        </Badge>
      </TableCell>
      <TableCell className="py-3">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">
            {item.nextRenewal
              ? fmtDate(item.nextRenewal, locale, { day: "numeric", month: "short", year: "numeric" })
              : "—"}
          </span>
        </div>
      </TableCell>
      <TableCell className="py-3">
        <Badge variant={isMarkedForCancel ? "outline" : "default"}>
          {t(`statuses.${item.status}` as never)}
        </Badge>
      </TableCell>
      <TableCell className="py-3 text-right">
        <SubscriptionActions item={item} onUpdate={onUpdate} onDelete={onDelete} />
      </TableCell>
    </>
  );
}
