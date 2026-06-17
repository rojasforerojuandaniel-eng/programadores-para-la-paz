import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  colorClassName?: string;
  showLabel?: boolean;
  label?: React.ReactNode;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  colorClassName = "bg-primary",
  showLabel = true,
  label,
  className,
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={cn("w-full space-y-1", className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{label ?? `${percentage.toFixed(0)}%`}</span>
          <span>{`${value.toLocaleString("es-CO")} / ${max.toLocaleString("es-CO")}`}</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={typeof label === "string" ? label : "Progreso"}
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full transition-all", colorClassName)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
