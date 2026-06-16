import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  footer?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  footer,
  className,
  valueClassName,
}: KpiCardProps) {
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
            {footer && <div className="mt-2">{footer}</div>}
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
