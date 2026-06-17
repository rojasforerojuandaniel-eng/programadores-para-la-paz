import { cn } from "@/lib/utils";

interface ProjectProgressProps {
  spent: number;
  budget: number;
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProjectProgress({ spent, budget }: ProjectProgressProps) {
  const progress = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const overBudget = budget > 0 && spent > budget;
  const noBudget = budget === 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className={cn("font-medium", noBudget ? "text-muted-foreground" : "text-foreground")}>
          {noBudget ? "Sin presupuesto" : formatCOP(spent)}
        </span>
        <span
          className={cn(
            "text-xs font-medium",
            overBudget ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {noBudget ? "—" : `${progress}%`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            overBudget ? "bg-destructive" : "bg-primary"
          )}
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label={`Progreso de gasto: ${progress}%`}
        />
      </div>
      {!noBudget && (
        <p className="text-xs text-muted-foreground">
          Presupuesto {formatCOP(budget)}
        </p>
      )}
    </div>
  );
}
