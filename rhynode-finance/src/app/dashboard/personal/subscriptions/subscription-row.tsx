"use client";

import { TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, AlertTriangle, Ban, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubscriptionItem } from "./subscription-utils";
import {
  formatCurrency,
  formatDate,
  frequencyLabel,
  monthlyEquivalent,
  statusLabel,
} from "./subscription-utils";
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
                <AlertTriangle className="h-3 w-3" /> Sin usar
              </Badge>
            )}
            {item.increased && (
              <Badge variant="outline" className="gap-1 border-rose-500/30 text-rose-500">
                <ArrowUp className="h-3 w-3" /> Subió
              </Badge>
            )}
            {isMarkedForCancel && (
              <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-500">
                <Ban className="h-3 w-3" /> Para cancelar
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
            {formatCurrency(item.amount, item.currency)}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatCurrency(monthlyEquivalent(item.amount, item.frequency), item.currency)} / mes
          </span>
        </div>
      </TableCell>
      <TableCell className="py-3">
        <Badge variant="outline" className="capitalize">
          {frequencyLabel(item.frequency)}
        </Badge>
      </TableCell>
      <TableCell className="py-3">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{formatDate(item.nextRenewal)}</span>
        </div>
      </TableCell>
      <TableCell className="py-3">
        <Badge variant={isMarkedForCancel ? "outline" : "default"}>
          {statusLabel(item.status)}
        </Badge>
      </TableCell>
      <TableCell className="py-3 text-right">
        <SubscriptionActions item={item} onUpdate={onUpdate} onDelete={onDelete} />
      </TableCell>
    </>
  );
}
