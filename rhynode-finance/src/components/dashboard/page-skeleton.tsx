import { cn } from "@/lib/utils";
import type React from "react";

type PageSkeletonVariant = "dashboard" | "transactions" | "invoices" | "budgets" | "goals" | "generic";

interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
  className?: string;
}

interface SkeletonBlockProps {
  className?: string;
  style?: React.CSSProperties;
}

function SkeletonBlock({ className, style }: SkeletonBlockProps) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-muted", className)}
      style={style}
      aria-hidden="true"
    />
  );
}

export function KpiSkeleton({ count = 3, columns = 3 }: { count?: number; columns?: number }) {
  const gridClass =
    columns === 4
      ? "grid-cols-2 sm:grid-cols-4"
      : columns === 2
      ? "grid-cols-2"
      : "grid-cols-1 sm:grid-cols-3";

  return (
    <div className={cn("grid gap-3 sm:gap-4", gridClass)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="surface-elevated-2 flex items-start justify-between gap-3 rounded-xl p-4 sm:p-5"
        >
          <div className="min-w-0 flex-1 space-y-3">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-8 w-32" />
            <SkeletonBlock className="h-5 w-20" />
          </div>
          <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full sm:h-11 sm:w-11" />
        </div>
      ))}
    </div>
  );
}

export function HeaderSkeleton({ titleWidth = 48, subtitleWidth = 64 }: { titleWidth?: number; subtitleWidth?: number }) {
  return (
    <div className="space-y-2">
      <SkeletonBlock className="h-8" style={{ width: `${titleWidth * 0.25}rem` }} />
      <SkeletonBlock className="h-5" style={{ width: `${subtitleWidth * 0.25}rem` }} />
    </div>
  );
}

export function TableRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="hidden h-10 grid-cols-6 gap-4 md:grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-4" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="surface-elevated-2 flex flex-col gap-3 rounded-xl p-4 md:hidden"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-3/4" />
              <SkeletonBlock className="h-4 w-1/2" />
            </div>
            <SkeletonBlock className="h-6 w-16" />
          </div>
          <SkeletonBlock className="h-4 w-2/3" />
          <SkeletonBlock className="h-4 w-full" />
        </div>
      ))}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={`d-${i}`} className="hidden h-12 grid-cols-6 gap-4 md:grid">
          {Array.from({ length: 6 }).map((_, j) => (
            <SkeletonBlock key={j} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ProgressRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="surface-elevated-2 space-y-3 rounded-xl p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-6 w-16" />
          </div>
          <SkeletonBlock className="h-2 w-full" />
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-4 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WidgetGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock
          key={i}
          className="h-56 rounded-xl"
        />
      ))}
    </div>
  );
}

export function PageSkeleton({ variant = "generic", className }: PageSkeletonProps) {
  switch (variant) {
    case "dashboard":
      return (
        <div className={cn("space-y-6", className)}>
          <HeaderSkeleton titleWidth={40} subtitleWidth={56} />
          <div className="space-y-4">
            <SkeletonBlock className="h-24 w-full rounded-xl" />
            <KpiSkeleton count={4} columns={4} />
            <WidgetGridSkeleton count={6} />
          </div>
        </div>
      );

    case "transactions":
      return (
        <div className={cn("space-y-5 sm:space-y-6", className)}>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <HeaderSkeleton titleWidth={48} subtitleWidth={72} />
            <div className="flex gap-2">
              <SkeletonBlock className="h-10 w-28" />
              <SkeletonBlock className="h-10 w-36" />
            </div>
          </div>
          <KpiSkeleton count={3} columns={3} />
          <div className="surface-elevated-2 space-y-4 rounded-xl p-4 sm:p-5">
            <SkeletonBlock className="h-6 w-48" />
            <TableRowsSkeleton rows={5} />
          </div>
        </div>
      );

    case "invoices":
      return (
        <div className={cn("space-y-5 sm:space-y-6", className)}>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <HeaderSkeleton titleWidth={40} subtitleWidth={64} />
            <SkeletonBlock className="h-10 w-36" />
          </div>
          <KpiSkeleton count={4} columns={4} />
          <div className="surface-elevated-2 space-y-4 rounded-xl p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <SkeletonBlock className="h-6 w-48" />
              <SkeletonBlock className="h-10 w-full sm:w-40" />
            </div>
            <TableRowsSkeleton rows={4} />
          </div>
        </div>
      );

    case "budgets":
    case "goals":
      return (
        <div className={cn("space-y-6", className)}>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <HeaderSkeleton titleWidth={48} subtitleWidth={64} />
            <SkeletonBlock className="h-10 w-36" />
          </div>
          <KpiSkeleton count={3} columns={3} />
          <ProgressRowsSkeleton rows={4} />
        </div>
      );

    case "generic":
    default:
      return (
        <div className={cn("space-y-6", className)}>
          <HeaderSkeleton />
          <KpiSkeleton count={6} columns={3} />
          <ProgressRowsSkeleton rows={3} />
        </div>
      );
  }
}

export function DashboardSkeleton(props: Omit<PageSkeletonProps, "variant">) {
  return <PageSkeleton variant="dashboard" {...props} />;
}

export function TransactionsSkeleton(props: Omit<PageSkeletonProps, "variant">) {
  return <PageSkeleton variant="transactions" {...props} />;
}

export function InvoicesSkeleton(props: Omit<PageSkeletonProps, "variant">) {
  return <PageSkeleton variant="invoices" {...props} />;
}

export function BudgetsSkeleton(props: Omit<PageSkeletonProps, "variant">) {
  return <PageSkeleton variant="budgets" {...props} />;
}

export function GoalsSkeleton(props: Omit<PageSkeletonProps, "variant">) {
  return <PageSkeleton variant="goals" {...props} />;
}
