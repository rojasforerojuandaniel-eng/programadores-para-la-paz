import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

type EmptyStateVariant = "sm" | "md" | "lg";

interface EmptyStateCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  hint?: string;
  action?: ReactNode;
  variant?: EmptyStateVariant;
  className?: string;
}

const variantConfig: Record<
  EmptyStateVariant,
  {
    card: string;
    iconWrapper: string;
    icon: string;
    title: string;
    description: string;
    hint: string;
  }
> = {
  sm: {
    card: "px-4 py-8 sm:py-10",
    iconWrapper: "h-12 w-12 rounded-xl",
    icon: "h-6 w-6",
    title: "text-base",
    description: "text-sm",
    hint: "text-xs",
  },
  md: {
    card: "px-6 py-12 sm:px-8 sm:py-16",
    iconWrapper: "h-16 w-16 rounded-2xl",
    icon: "h-8 w-8",
    title: "text-xl",
    description: "text-sm",
    hint: "text-xs",
  },
  lg: {
    card: "px-6 py-16 sm:px-8 sm:py-20",
    iconWrapper: "h-20 w-20 rounded-2xl",
    icon: "h-10 w-10",
    title: "text-2xl",
    description: "text-base",
    hint: "text-sm",
  },
};

export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  hint,
  action,
  variant = "md",
  className,
}: EmptyStateCardProps) {
  const config = variantConfig[variant];

  return (
    <Card
      role="status"
      aria-live="polite"
      className={cn(
        "surface-elevated-2 relative overflow-hidden rounded-2xl border-border",
        "animate-in fade-in slide-in-from-bottom-4 duration-500",
        className
      )}
    >
      <CardContent
        className={cn(
          "relative flex flex-col items-center justify-center text-center",
          config.card
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center bg-gradient-to-br from-primary/25 to-primary/5 text-primary shadow-sm ring-1 ring-primary/10",
            "animate-empty-state-pulse",
            config.iconWrapper
          )}
          aria-hidden="true"
        >
          <Icon className={cn(config.icon)} />
        </div>
        <h2 className={cn("mt-5 font-semibold tracking-tight text-foreground", config.title)}>
          {title}
        </h2>
        {description && (
          <p
            className={cn(
              "mt-2 max-w-sm leading-relaxed text-muted-foreground",
              config.description
            )}
          >
            {description}
          </p>
        )}
        {hint && (
          <p
            className={cn(
              "mt-3 max-w-sm font-medium text-primary/90",
              config.hint
            )}
          >
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
