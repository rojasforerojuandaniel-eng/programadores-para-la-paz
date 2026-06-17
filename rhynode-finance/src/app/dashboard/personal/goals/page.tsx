import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ServerDataTable } from "@/components/dashboard/server-data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { ProgressRowsSkeleton } from "@/components/dashboard/page-skeleton";
import { TableCell } from "@/components/ui/table";
import { CreateGoalDialog } from "./create-dialog";
import { AddSavingsDialog } from "./add-savings-dialog";
import { Target, CheckCircle2, Wallet, Calendar } from "lucide-react";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getDaysLeft(deadline: Date | string | null | undefined) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
}

function getDeadlineLabel(daysLeft: number | null) {
  if (daysLeft === null) return null;
  if (daysLeft < 0) return `Vencida hace ${Math.abs(daysLeft)} días`;
  if (daysLeft === 0) return "Vence hoy";
  return `${daysLeft} días restantes`;
}

function EmptyState() {
  return (
    <EmptyStateCard
      variant="lg"
      icon={Target}
      title="Alcanza tus metas de ahorro"
      description="Define objetivos claros y haz seguimiento visual de tu progreso día a día."
      hint="Empieza creando tu primera meta."
      action={<CreateGoalDialog />}
    />
  );
}

export default async function GoalsPage() {
  const profile = await getUserProfile();
  if (!profile) return null;

  const prisma = getPrisma();
  const goals = await prisma.goal.findMany({
    where: { userId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  const totalTarget = goals.reduce((s, g) => s + decimalToNumber(g.targetAmount), 0);
  const totalCurrent = goals.reduce((s, g) => s + decimalToNumber(g.currentAmount), 0);
  const completed = goals.filter((g) => g.status === "COMPLETED").length;

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
        <CreateGoalDialog />
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

      <Suspense fallback={<ProgressRowsSkeleton rows={3} />}>
        <ServerDataTable
          columns={columns}
          data={goals}
          emptyState={<EmptyState />}
          renderRow={(goal) => {
            const targetAmount = decimalToNumber(goal.targetAmount);
            const currentAmount = decimalToNumber(goal.currentAmount);
            const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
            const isCompleted = goal.status === "COMPLETED";
            const colorClass = isCompleted ? "bg-success" : progress >= 75 ? "bg-primary" : "bg-primary";
            const daysLeft = getDaysLeft(goal.deadline);

            return (
              <>
                <TableCell className="py-3 font-medium">{goal.name}</TableCell>
                <TableCell className="py-3">{formatCurrency(targetAmount, goal.currency)}</TableCell>
                <TableCell className="py-3 font-medium">{formatCurrency(currentAmount, goal.currency)}</TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${colorClass}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  {goal.deadline ? (
                    <div className="flex flex-col">
                      <span>{formatDate(goal.deadline)}</span>
                      {daysLeft !== null && (
                        <span className={`text-xs ${daysLeft < 0 ? "text-danger" : "text-muted-foreground"}`}>
                          {getDeadlineLabel(daysLeft)}
                        </span>
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
            const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
            const isCompleted = goal.status === "COMPLETED";
            const colorClass = isCompleted ? "bg-success" : progress >= 75 ? "bg-primary" : "bg-primary";
            const daysLeft = getDaysLeft(goal.deadline);

            return (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-tight">{goal.name}</h3>
                    {goal.deadline && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(goal.deadline)}
                        {daysLeft !== null && (
                          <span className={daysLeft < 0 ? "text-danger" : ""}>
                            {" · "}
                            {getDeadlineLabel(daysLeft)?.toLowerCase()}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <Badge variant={isCompleted ? "default" : "outline"}>
                    {isCompleted ? "Completada" : "Activa"}
                  </Badge>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">{formatCurrency(currentAmount, goal.currency)}</span>
                  <span className="text-sm text-muted-foreground">/ {formatCurrency(targetAmount, goal.currency)}</span>
                </div>

                <ProgressBar
                  value={currentAmount}
                  max={targetAmount}
                  colorClassName={colorClass}
                  label={`${progress.toFixed(0)}% completado`}
                />

                {isCompleted && (
                  <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success" role="status">
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
