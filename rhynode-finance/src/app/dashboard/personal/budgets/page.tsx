import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { dashboardMetadata } from "@/lib/dashboard-metadata";
import { Badge } from "@/components/ui/badge";
import { ServerDataTable } from "@/components/dashboard/server-data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { ProgressRowsSkeleton } from "@/components/dashboard/page-skeleton";
import { TableCell } from "@/components/ui/table";
import { CreateBudgetDialog, ShareBudgetDialog } from "./create-dialog";
import { PiggyBank, Receipt, AlertTriangle, Tag } from "lucide-react";

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
        colorClass: "bg-danger",
        textClass: "text-danger",
        badge: "destructive" as const,
      };
    case "WARNING":
      return {
        label: "Alerta",
        colorClass: "bg-warning",
        textClass: "text-warning",
        badge: "secondary" as const,
      };
    default:
      return {
        label: "OK",
        colorClass: "bg-success",
        textClass: "text-success",
        badge: "outline" as const,
      };
  }
}

function EmptyState() {
  return (
    <EmptyStateCard
      variant="lg"
      icon={PiggyBank}
      title="Controla tus gastos con presupuestos"
      description="Establece límites por categoría y recibe alertas antes de excederte."
      hint="Empieza creando tu primer presupuesto."
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
    { key: "category", header: "Categoría" },
    { key: "amount", header: "Total" },
    { key: "spent", header: "Gastado" },
    { key: "used", header: "% Usado" },
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
            valueClassName={totalSpent > totalBudgeted ? "text-danger" : "text-foreground"}
          />
          <KpiCard
            label="Excedidos"
            value={exceededCount}
            icon={AlertTriangle}
            valueClassName={exceededCount > 0 ? "text-warning" : "text-foreground"}
          />
        </div>
      )}

      <Suspense fallback={<ProgressRowsSkeleton rows={3} />}>
        <ServerDataTable
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
                <TableCell className="py-3">
                  {budget.category ? (
                    <Badge variant="outline" className="gap-1 font-normal">
                      <Tag className="h-3 w-3" />
                      {budget.category.name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="py-3">{formatCurrency(amount, "COP")}</TableCell>
                <TableCell className="py-3 font-medium">{formatCurrency(spent, "COP")}</TableCell>
                <TableCell className="py-3">
                  <div className="w-full max-w-[180px] space-y-1.5">
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
                  <Badge variant={meta.badge}>{meta.label}</Badge>
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
            const remaining = amount - spent;

            return (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-tight">{budget.name}</h3>
                    {budget.category && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Tag className="h-3 w-3" />
                        {budget.category.name}
                      </p>
                    )}
                  </div>
                  <Badge variant={meta.badge}>{meta.label}</Badge>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">{formatCurrency(spent, "COP")}</span>
                  <span className="text-sm text-muted-foreground">/ {formatCurrency(amount, "COP")}</span>
                </div>

                <ProgressBar
                  value={spent}
                  max={amount}
                  colorClassName={meta.colorClass}
                  label={
                    <span className={meta.textClass}>
                      {progress.toFixed(0)}% usado · {meta.label}
                    </span>
                  }
                />

                {(status === "EXCEEDED" || status === "WARNING") && (
                  <div
                    className={`rounded-lg px-3 py-2 text-sm ${
                      status === "EXCEEDED"
                        ? "bg-danger/10 text-danger"
                        : "bg-warning/10 text-warning"
                    }`}
                    role="status"
                  >
                    {status === "EXCEEDED"
                      ? `Has excedido el presupuesto en ${formatCurrency(Math.abs(remaining), "COP")}.`
                      : `Te quedan ${formatCurrency(remaining, "COP")} antes de alcanzar el límite.`}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Badge variant="outline">{budget.period}</Badge>
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
