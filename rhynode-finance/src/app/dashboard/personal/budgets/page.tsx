import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { dashboardMetadata } from "@/lib/dashboard-metadata";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/dashboard/data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { TableCell } from "@/components/ui/table";
import { CreateBudgetDialog, ShareBudgetDialog } from "./create-dialog";
import { PiggyBank, Receipt, AlertTriangle } from "lucide-react";

export const metadata = dashboardMetadata(
  "Presupuestos",
  "Crea presupuestos mensuales por categoría, compártelos y recibe alertas cuando te acerques al límite."
);

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function getBudgetStatus(progress: number) {
  if (progress >= 100) return "EXCEEDED" as const;
  if (progress >= 80) return "WARNING" as const;
  return "OK" as const;
}

function statusMeta(status: ReturnType<typeof getBudgetStatus>) {
  switch (status) {
    case "EXCEEDED":
      return {
        label: "Excedido",
        colorClass: "bg-rose-500",
        textClass: "text-rose-500",
      };
    case "WARNING":
      return {
        label: "Alerta",
        colorClass: "bg-amber-500",
        textClass: "text-amber-500",
      };
    default:
      return {
        label: "OK",
        colorClass: "bg-emerald-500",
        textClass: "text-emerald-500",
      };
  }
}

function EmptyState() {
  return (
    <EmptyStateCard
      icon={PiggyBank}
      title="No tienes presupuestos"
      description="Crea tu primer presupuesto y controla tus gastos."
      action={<CreateBudgetDialog />}
    />
  );
}

export default async function BudgetsPage() {
  const profile = await getUserProfile();
  if (!profile) return null;

  const prisma = getPrisma();
  const budgets = await prisma.budget.findMany({
    where: { userId: profile.id },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  const totalBudgeted = budgets.reduce((s, b) => s + decimalToNumber(b.amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + decimalToNumber(b.spent), 0);
  const exceededCount = budgets.filter((b) => {
    const amount = decimalToNumber(b.amount);
    return amount > 0 && (decimalToNumber(b.spent) / amount) * 100 >= 100;
  }).length;

  const columns = [
    { key: "name", header: "Nombre" },
    { key: "amount", header: "Monto" },
    { key: "spent", header: "Gastado" },
    { key: "period", header: "Periodo" },
    { key: "status", header: "Estado" },
    { key: "actions", header: "Acciones" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">Presupuestos</h1>
          <p className="body-default mt-1">Administra tus presupuestos personales</p>
        </div>
        <CreateBudgetDialog />
      </div>

      {budgets.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Presupuestado" value={formatCurrency(totalBudgeted, "COP")} icon={PiggyBank} />
          <KpiCard
            label="Gastado"
            value={formatCurrency(totalSpent, "COP")}
            icon={Receipt}
            valueClassName={totalSpent > totalBudgeted ? "text-rose-500" : "text-foreground"}
          />
          <KpiCard
            label="Excedidos"
            value={exceededCount}
            icon={AlertTriangle}
            valueClassName={exceededCount > 0 ? "text-amber-500" : "text-foreground"}
          />
        </div>
      )}

      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <DataTable
          columns={columns}
          data={budgets}
          emptyState={<EmptyState />}
          renderRow={(budget) => {
            const amount = decimalToNumber(budget.amount);
            const spent = decimalToNumber(budget.spent);
            const progress = amount > 0 ? (spent / amount) * 100 : 0;
            const status = getBudgetStatus(progress);
            const meta = statusMeta(status);
            return (
              <>
                <TableCell className="py-3 font-medium">{budget.name}</TableCell>
                <TableCell className="py-3">{formatCurrency(amount, "COP")}</TableCell>
                <TableCell className="py-3">{formatCurrency(spent, "COP")}</TableCell>
                <TableCell className="py-3">
                  <Badge variant="outline">{budget.period}</Badge>
                </TableCell>
                <TableCell className="py-3">
                  <div className="w-full max-w-[160px] space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{progress.toFixed(0)}%</span>
                      <span className={meta.textClass}>{meta.label}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${meta.colorClass}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <ShareBudgetDialog budgetId={budget.id} budgetName={budget.name} />
                </TableCell>
              </>
            );
          }}
          renderCard={(budget) => {
            const amount = decimalToNumber(budget.amount);
            const spent = decimalToNumber(budget.spent);
            const progress = amount > 0 ? (spent / amount) * 100 : 0;
            const status = getBudgetStatus(progress);
            const meta = statusMeta(status);
            return (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium">{budget.name}</span>
                  <Badge variant="outline">{budget.period}</Badge>
                </div>
                <ProgressBar
                  value={spent}
                  max={amount}
                  colorClassName={meta.colorClass}
                  label={
                    <span className={meta.textClass}>
                      {progress.toFixed(0)}% · {meta.label}
                    </span>
                  }
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {formatCurrency(spent, "COP")} / {formatCurrency(amount, "COP")}
                  </span>
                  <ShareBudgetDialog budgetId={budget.id} budgetName={budget.name} />
                </div>
              </div>
            );
          }}
        />
      </Suspense>
    </div>
  );
}
