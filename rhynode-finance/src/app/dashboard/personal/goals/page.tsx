import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ServerDataTable } from "@/components/dashboard/server-data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { CircularProgress } from "@/components/dashboard/circular-progress";
import { ProgressRowsSkeleton } from "@/components/dashboard/page-skeleton";
import { TableCell } from "@/components/ui/table";
import { CreateGoalDialog } from "./create-dialog";
import { AddSavingsDialog } from "./add-savings-dialog";
import {
  formatCurrency,
  daysLeft,
  progressPercentage,
  suggestGoalBasedOnAverage,
} from "@/lib/finance-math";
import { Target, CheckCircle2, Wallet, Calendar, Sparkles } from "lucide-react";

function formatDate(date: Date | string | null | undefined) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function deadlineLabel(days: number | null) {
  if (days === null) return null;
  if (days < 0) return `Vencida hace ${Math.abs(days)} días`;
  if (days === 0) return "Vence hoy";
  return `${days} días restantes`;
}

function deadlineBadgeVariant(days: number | null, isCompleted: boolean) {
  if (isCompleted) return "default";
  if (days === null) return "outline";
  if (days < 0) return "destructive";
  if (days <= 7) return "secondary";
  return "outline";
}

function EmptyState({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <EmptyStateCard
      variant="lg"
      icon={Target}
      title="Alcanza tus metas de ahorro"
      description="Define objetivos claros y haz seguimiento visual de tu progreso día a día."
      hint="Empieza creando tu primera meta."
      action={<CreateGoalDialog defaultOpen={defaultOpen} />}
    />
  );
}

interface GoalsPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function GoalsPage({ searchParams }: GoalsPageProps) {
  const profile = await getUserProfile();
  if (!profile) return null;

  const prisma = getPrisma();
  const goals = await prisma.goal.findMany({
    where: { userId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  const totalTarget = goals.reduce(
    (s, g) => s + decimalToNumber(g.targetAmount),
    0
  );
  const totalCurrent = goals.reduce(
    (s, g) => s + decimalToNumber(g.currentAmount),
    0
  );
  const completed = goals.filter((g) => g.status === "COMPLETED").length;

  const suggestion = suggestGoalBasedOnAverage(
    goals.map((g) => ({
      targetAmount: decimalToNumber(g.targetAmount),
      currentAmount: decimalToNumber(g.currentAmount),
      deadline: g.deadline,
    }))
  );

  const columns = [
    { key: "name", header: "Nombre" },
    { key: "target", header: "Meta" },
    { key: "saved", header: "Ahorrado" },
    { key: "progress", header: "Progreso" },
    { key: "deadline", header: "Fecha objetivo" },
    { key: "status", header: "Estado" },
    { key: "actions", header: "Acciones" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">Metas</h1>
          <p className="body-default mt-1">Administra tus metas de ahorro</p>
        </div>
        <CreateGoalDialog defaultOpen={searchParams?.new === "1"} />
      </div>

      {goals.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Meta Total" value={formatCurrency(totalTarget, "COP")} icon={Target} />
          <KpiCard
            label="Ahorrado"
            value={formatCurrency(totalCurrent, "COP")}
            icon={Wallet}
            valueClassName="text-success"
          />
          <KpiCard label="Completadas" value={completed} icon={CheckCircle2} />
        </div>
      )}

      {suggestion && (
        <div className="surface-elevated-2 rounded-xl border border-border p-4 sm:p-5">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium">Sugerencia de meta</p>
                <p className="text-sm text-muted-foreground">
                  Tu ahorro promedio mensual es{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(suggestion.monthlyAverage, "COP")}
                  </span>
                  . Podrías alcanzar{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(suggestion.suggestedTarget, "COP")}
                  </span>{" "}
                  en 6 meses.
                </p>
              </div>
            </div>
            <CreateGoalDialog
              defaultValues={{
                name: "Nueva meta sugerida",
                targetAmount: Math.round(suggestion.suggestedTarget),
                currency: "COP",
                deadline: suggestion.suggestedDeadline,
                icon: "Target",
                color: "",
              }}
              trigger={
                <button type="button" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                  Crear meta sugerida
                </button>
              }
            />
          </div>
        </div>
      )}

      <Suspense fallback={<ProgressRowsSkeleton rows={3} />}>
        <ServerDataTable
          columns={columns}
          data={goals}
          emptyState={<EmptyState defaultOpen={searchParams?.new === "1"} />}
          renderRow={(goal) => {
            const targetAmount = decimalToNumber(goal.targetAmount);
            const currentAmount = decimalToNumber(goal.currentAmount);
            const progress = progressPercentage(currentAmount, targetAmount);
            const isCompleted = goal.status === "COMPLETED";
            const goalDaysLeft = daysLeft(goal.deadline);

            return (
              <>
                <TableCell className="py-3 font-medium">{goal.name}</TableCell>
                <TableCell className="py-3">
                  {formatCurrency(targetAmount, goal.currency)}
                </TableCell>
                <TableCell className="py-3 font-medium">
                  {formatCurrency(currentAmount, goal.currency)}
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-3">
                    <CircularProgress
                      value={progress}
                      size={40}
                      strokeWidth={5}
                      colorClassName={isCompleted ? "text-success" : "text-primary"}
                      trackClassName="text-muted"
                    />
                    <span className="text-sm text-muted-foreground">
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  {goal.deadline ? (
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatDate(goal.deadline)}
                      </span>
                      {goalDaysLeft !== null && (
                        <Badge
                          variant={deadlineBadgeVariant(goalDaysLeft, isCompleted)}
                          className="w-fit text-xs"
                        >
                          {deadlineLabel(goalDaysLeft)}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Sin fecha</span>
                  )}
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant={isCompleted ? "default" : "outline"}>
                    {isCompleted ? "Completada" : "Activa"}
                  </Badge>
                </TableCell>
                <TableCell className="py-3">
                  {!isCompleted && (
                    <AddSavingsDialog
                      goalId={goal.id}
                      goalName={goal.name}
                      currency={goal.currency}
                    />
                  )}
                </TableCell>
              </>
            );
          }}
          renderCard={(goal) => {
            const targetAmount = decimalToNumber(goal.targetAmount);
            const currentAmount = decimalToNumber(goal.currentAmount);
            const progress = progressPercentage(currentAmount, targetAmount);
            const isCompleted = goal.status === "COMPLETED";
            const goalDaysLeft = daysLeft(goal.deadline);
            const colorClass = isCompleted ? "text-success" : "text-primary";

            return (
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-tight">{goal.name}</h3>
                    {goal.deadline && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(goal.deadline)}
                      </p>
                    )}
                  </div>
                  <Badge variant={isCompleted ? "default" : "outline"}>
                    {isCompleted ? "Completada" : "Activa"}
                  </Badge>
                </div>

                <div className="flex items-center justify-center py-2">
                  <CircularProgress
                    value={progress}
                    size={110}
                    strokeWidth={10}
                    colorClassName={colorClass}
                    trackClassName="text-muted"
                    label={
                      <span className="text-lg font-bold">{progress.toFixed(0)}%</span>
                    }
                  />
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold tracking-tight">
                    {formatCurrency(currentAmount, goal.currency)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    de {formatCurrency(targetAmount, goal.currency)}
                  </div>
                </div>

                {goalDaysLeft !== null && (
                  <Badge
                    variant={deadlineBadgeVariant(goalDaysLeft, isCompleted)}
                    className="w-fit self-center"
                  >
                    {deadlineLabel(goalDaysLeft)}
                  </Badge>
                )}

                {isCompleted && (
                  <div
                    className="rounded-lg bg-success/10 px-3 py-2 text-center text-sm text-success"
                    role="status"
                  >
                    Meta alcanzada.
                  </div>
                )}

                {!isCompleted && (
                  <div className="flex items-center justify-end pt-1">
                    <AddSavingsDialog
                      goalId={goal.id}
                      goalName={goal.name}
                      currency={goal.currency}
                    />
                  </div>
                )}
              </div>
            );
          }}
        />
      </Suspense>
    </div>
  );
}
