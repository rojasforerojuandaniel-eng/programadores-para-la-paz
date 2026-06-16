import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  hint,
  action,
  className,
}: EmptyStateCardProps) {
  return (
    <Card
      className={cn(
        "surface-elevated-2 relative overflow-hidden rounded-2xl border-border",
        className
      )}
    >
      <CardContent className="relative flex flex-col items-center justify-center px-6 py-12 text-center sm:px-8 sm:py-16">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 text-primary shadow-sm ring-1 ring-primary/10"
          aria-hidden="true"
        >
          <Icon className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        {hint && (
          <p className="mt-3 max-w-sm text-xs font-medium text-primary/90">
            {hint}
          </p>
        )}
        {action && (
          <div className="mt-6 w-full sm:w-auto [&>*]:w-full [&>*]:sm:w-auto">
            {action}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
