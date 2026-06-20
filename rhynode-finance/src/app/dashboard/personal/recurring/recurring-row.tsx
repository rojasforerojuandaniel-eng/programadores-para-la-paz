"use client";

import { TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CreditCard } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import type { RecurringItem } from "./recurring-utils";
import { formatCurrency, formatDate, typeBadgeVariant } from "./recurring-utils";
import { RecurringActions } from "./recurring-actions";
import type { Locale } from "@/lib/locale";

interface RecurringRowProps {
  item: RecurringItem;
  onToggle: (item: RecurringItem, active: boolean) => void;
  onUpdate: (item: RecurringItem) => void;
  onDelete: (id: string) => void;
}

export function RecurringRow({
  item,
  onToggle,
  onUpdate,
  onDelete,
}: RecurringRowProps) {
  const isActive = item.status === "ACTIVE";
  const t = useTranslations("dashboard.recurring");
  const locale = useLocale() as Locale;

  return (
    <>
      <TableCell className="py-3">
        <div className="flex flex-col gap-1">
          <span className="font-medium">{item.name}</span>
          {item.provider && (
            <span className="text-xs text-muted-foreground">{item.provider}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-3 font-medium">
        {formatCurrency(item.amount, item.accountCurrency || "COP", locale)}
      </TableCell>
      <TableCell className="py-3">
        <Badge variant="outline">{t(`frequencies.${item.frequency}` as never)}</Badge>
      </TableCell>
      <TableCell className="py-3">{formatDate(item.nextDueDate, locale)}</TableCell>
      <TableCell className="py-3">
        <Badge variant={typeBadgeVariant(item.type)}>{t(`types.${item.type}` as never)}</Badge>
      </TableCell>
      <TableCell className="py-3">
        {item.isSubscription ? (
          <Badge variant="default" className="gap-1">
            <CreditCard className="h-3 w-3" /> {t("subscription")}
          </Badge>
        ) : (
          <Badge variant="outline">{t("no")}</Badge>
        )}
      </TableCell>
      <TableCell className="py-3">
        <Switch
          checked={isActive}
          onCheckedChange={(checked) => onToggle(item, checked)}
          aria-label={isActive ? t("pause") : t("activate")}
        />
      </TableCell>
      <TableCell className="py-3 text-right">
        <RecurringActions item={item} onUpdate={onUpdate} onDelete={onDelete} />
      </TableCell>
    </>
  );
}