import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ServerDataTable } from "@/components/dashboard/server-data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { TableCell } from "@/components/ui/table";
import { CreateGoalDialog } from "./create-dialog";
import { Target, CheckCircle2, Wallet } from "lucide-react";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function EmptyState() {
  return (
    <EmptyStateCard
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
    { key: "current", header: "Actual" },
    { key: "progress", header: "Progreso" },
    { key: "deadline", header: "Fecha límite" },
    { key: "status", header: "Estado" },
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
            valueClassName="text-emerald-500"
          />
          <KpiCard label="Completadas" value={completed} icon={CheckCircle2} />
        </div>
      )}

      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <ServerDataTable
          columns={columns}
          data={goals}
          emptyState={<EmptyState />}
          renderRow={(goal) => {
            const targetAmount = decimalToNumber(goal.targetAmount);
            const currentAmount = decimalToNumber(goal.currentAmount);
            const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
            return (
              <>
                <TableCell className="py-3 font-medium">{goal.name}</TableCell>
                <TableCell className="py-3">{formatCurrency(targetAmount, goal.currency)}</TableCell>
                <TableCell className="py-3">{formatCurrency(currentAmount, goal.currency)}</TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  {goal.deadline ? new Date(goal.deadline).toLocaleDateString("es-CO") : "-"}
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant={goal.status === "COMPLETED" ? "default" : "outline"}>
                    {goal.status === "COMPLETED" ? "Completada" : "Activa"}
                  </Badge>
                </TableCell>
              </>
            );
          }}
          renderCard={(goal) => {
            const targetAmount = decimalToNumber(goal.targetAmount);
            const currentAmount = decimalToNumber(goal.currentAmount);
            const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
            return (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium">{goal.name}</span>
                  <Badge variant={goal.status === "COMPLETED" ? "default" : "outline"}>
                    {goal.status === "COMPLETED" ? "Completada" : "Activa"}
                  </Badge>
                </div>
                <ProgressBar
                  value={currentAmount}
                  max={targetAmount}
                  colorClassName={progress >= 100 ? "bg-emerald-500" : "bg-primary"}
                  label={`${progress.toFixed(0)}% alcanzado`}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {goal.deadline
                      ? new Date(goal.deadline).toLocaleDateString("es-CO")
                      : "Sin fecha límite"}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(currentAmount, goal.currency)} /{" "}
                    {formatCurrency(targetAmount, goal.currency)}
                  </span>
                </div>
              </div>
            );
          }}
        />
      </Suspense>
    </div>
  );
}
