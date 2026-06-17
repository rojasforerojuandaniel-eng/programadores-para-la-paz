"use client";

import { TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CreditCard } from "lucide-react";
import type { RecurringItem } from "./recurring-utils";
import {
  formatCurrency,
  formatDate,
  frequencyLabel,
  typeBadgeVariant,
  typeLabel,
} from "./recurring-utils";
import { RecurringActions } from "./recurring-actions";

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
        {formatCurrency(item.amount, item.accountCurrency || "COP")}
      </TableCell>
      <TableCell className="py-3">
        <Badge variant="outline">{frequencyLabel(item.frequency)}</Badge>
      </TableCell>
      <TableCell className="py-3">{formatDate(item.nextDueDate)}</TableCell>
      <TableCell className="py-3">
        <Badge variant={typeBadgeVariant(item.type)}>{typeLabel(item.type)}</Badge>
      </TableCell>
      <TableCell className="py-3">
        {item.isSubscription ? (
          <Badge variant="default" className="gap-1">
            <CreditCard className="h-3 w-3" /> Suscripción
          </Badge>
        ) : (
          <Badge variant="outline">No</Badge>
        )}
      </TableCell>
      <TableCell className="py-3">
        <Switch
          checked={isActive}
          onCheckedChange={(checked) => onToggle(item, checked)}
          aria-label={isActive ? "Pausar" : "Activar"}
        />
      </TableCell>
      <TableCell className="py-3 text-right">
        <RecurringActions
          item={item}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </TableCell>
    </>
  );
}
