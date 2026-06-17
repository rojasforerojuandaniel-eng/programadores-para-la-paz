import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  colorClassName?: string;
  trackClassName?: string;
  label?: ReactNode;
  className?: string;
}

export function CircularProgress({
  value,
  size = 72,
  strokeWidth = 8,
  colorClassName = "text-primary",
  trackClassName = "text-muted",
  label,
  className,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, Math.max(0, value));
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${percentage.toFixed(0)}% completado`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={trackClassName}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-700 ease-out", colorClassName)}
        />
      </svg>
      {label !== undefined && (
        <span className="absolute inset-0 flex items-center justify-center">
          {label}
        </span>
      )}
    </div>
  );
}
