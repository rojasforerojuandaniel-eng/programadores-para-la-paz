import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateCardProps) {
  return (
    <Card className={cn("surface-elevated-2 rounded-xl border-border", className)}>
      <CardContent className="flex flex-col items-center justify-center px-5 py-10 text-center sm:px-6 sm:py-12">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        {action && <div className="mt-5 w-full sm:w-auto">{action}</div>}
      </CardContent>
    </Card>
  );
}
