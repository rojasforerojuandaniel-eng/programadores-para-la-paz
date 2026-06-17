"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CreditCard, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecurringItem } from "./recurring-utils";
import {
  formatCurrency,
  formatDate,
  frequencyLabel,
  typeBadgeVariant,
  typeLabel,
} from "./recurring-utils";
import { RecurringActions } from "./recurring-actions";

interface RecurringCardProps {
  item: RecurringItem;
  onToggle: (item: RecurringItem, active: boolean) => void;
  onUpdate: (item: RecurringItem) => void;
  onDelete: (id: string) => void;
}

export function RecurringCard({
  item,
  onToggle,
  onUpdate,
  onDelete,
}: RecurringCardProps) {
  const isActive = item.status === "ACTIVE";

  return (
    <Card
      className={cn(
        "surface-elevated-2 rounded-xl border-border transition-opacity",
        !isActive && "opacity-80"
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{item.name}</span>
              {item.isSubscription && (
                <Badge variant="default" className="gap-1">
                  <CreditCard className="h-3 w-3" />
                  Suscripción
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant={typeBadgeVariant(item.type)}>
                {typeLabel(item.type)}
              </Badge>
              <Badge variant="outline">{frequencyLabel(item.frequency)}</Badge>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => onToggle(item, checked)}
              aria-label={isActive ? "Pausar" : "Activar"}
            />
            <RecurringActions
              item={item}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Monto</p>
            <p className="text-xl font-bold tracking-tight">
              {formatCurrency(item.amount, item.accountCurrency || "COP")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Próximo</p>
            <div className="flex items-center justify-end gap-1.5 text-sm font-medium">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              {formatDate(item.nextDueDate)}
            </div>
          </div>
        </div>

        {item.provider && (
          <p className="mt-3 text-xs text-muted-foreground">
            Proveedor: {item.provider}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
