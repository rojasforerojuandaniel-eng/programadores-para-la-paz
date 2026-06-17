"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowUp, AlertTriangle, Ban, Clock, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubscriptionItem } from "./subscription-utils";
import {
  formatCurrency,
  formatDate,
  frequencyLabel,
  monthlyEquivalent,
} from "./subscription-utils";
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
                  <Ban className="h-3 w-3" />
                  Para cancelar
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
                    ? `Vence ${item.daysRemaining === 0 ? "hoy" : `hace ${Math.abs(item.daysRemaining)} días`}`
                    : `En ${item.daysRemaining} días`}
                </Badge>
              )}
              {item.matched && (
                <Badge variant="outline" className="gap-1 border-blue-500/30 text-blue-500">
                  <Receipt className="h-3 w-3" />
                  Coincide pago
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {frequencyLabel(item.frequency)}
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
            <p className="text-xs text-muted-foreground">Monto</p>
            <p className="text-lg font-bold tracking-tight">
              {formatCurrency(item.amount, item.currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(monthlyEquivalent(item.amount, item.frequency), item.currency)} / mes
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Próxima renovación</p>
            <div className="flex items-center justify-end gap-1.5 text-sm font-medium">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              {formatDate(item.nextRenewal)}
            </div>
            {item.lastPaidAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Último pago: {formatDate(item.lastPaidAt)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
