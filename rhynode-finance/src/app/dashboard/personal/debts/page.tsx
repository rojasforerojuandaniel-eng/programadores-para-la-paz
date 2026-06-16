import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ServerDataTable } from "@/components/dashboard/server-data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { TableCell } from "@/components/ui/table";
import { CreateDebtDialog } from "./create-dialog";
import { Scale, AlertTriangle, Wallet, CheckCircle2 } from "lucide-react";

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
      icon={Scale}
      title="Mantén tus deudas bajo control"
      description="Registra préstamos y obligaciones para planificar su pago y reducir intereses."
      hint="Empieza creando tu primera deuda."
      action={<CreateDebtDialog />}
    />
  );
}

export default async function DebtsPage() {
  const profile = await getUserProfile();
  if (!profile) return null;

  const prisma = getPrisma();
  const debts = await prisma.debt.findMany({
    where: { userId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  const totalRemaining = debts
    .filter((d) => d.status !== "PAID")
    .reduce((s, d) => s + decimalToNumber(d.remainingAmount), 0);
  const activeCount = debts.filter((d) => d.status !== "PAID").length;
  const overdueCount = debts.filter(
    (d) => d.status !== "PAID" && d.dueDate && new Date(d.dueDate) < new Date()
  ).length;

  const columns = [
    { key: "name", header: "Nombre" },
    { key: "type", header: "Tipo" },
    { key: "counterparty", header: "Contraparte" },
    { key: "remaining", header: "Restante" },
    { key: "dueDate", header: "Vencimiento" },
    { key: "status", header: "Estado" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">Deudas</h1>
          <p className="body-default mt-1">Administra tus deudas y préstamos</p>
        </div>
        <CreateDebtDialog />
      </div>

      {debts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="Restante Total"
            value={formatCurrency(totalRemaining, "COP")}
            icon={Wallet}
            valueClassName="text-rose-500"
          />
          <KpiCard label="Activas" value={activeCount} icon={Scale} />
          <KpiCard
            label="Vencidas"
            value={overdueCount}
            icon={AlertTriangle}
            valueClassName={overdueCount > 0 ? "text-amber-500" : "text-foreground"}
          />
        </div>
      )}

      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <ServerDataTable
          columns={columns}
          data={debts}
          emptyState={<EmptyState />}
          renderRow={(debt) => (
            <>
              <TableCell className="py-3 font-medium">{debt.name}</TableCell>
              <TableCell className="py-3">
                <Badge variant={debt.type === "OWE" ? "destructive" : "default"}>
                  {debt.type === "OWE" ? "Debo" : "Me deben"}
                </Badge>
              </TableCell>
              <TableCell className="py-3">{debt.counterparty || "-"}</TableCell>
              <TableCell className="py-3">
                {formatCurrency(decimalToNumber(debt.remainingAmount), debt.currency)}
              </TableCell>
              <TableCell className="py-3">
                {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString("es-CO") : "-"}
              </TableCell>
              <TableCell className="py-3">
                <Badge variant={debt.status === "PAID" ? "default" : "outline"}>
                  {debt.status === "PAID" ? "Pagada" : "Activa"}
                </Badge>
              </TableCell>
            </>
          )}
          renderCard={(debt) => {
            const isOverdue =
              debt.status !== "PAID" && debt.dueDate && new Date(debt.dueDate) < new Date();
            return (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium">{debt.name}</span>
                  <Badge variant={debt.type === "OWE" ? "destructive" : "default"}>
                    {debt.type === "OWE" ? "Debo" : "Me deben"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-muted-foreground">Restante</div>
                  <div className="text-right font-semibold">
                    {formatCurrency(decimalToNumber(debt.remainingAmount), debt.currency)}
                  </div>
                  <div className="text-muted-foreground">Contraparte</div>
                  <div className="text-right">{debt.counterparty || "-"}</div>
                  <div className="text-muted-foreground">Vence</div>
                  <div className={`text-right ${isOverdue ? "text-amber-500 font-medium" : ""}`}>
                    {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString("es-CO") : "-"}
                    {isOverdue && " (vencida)"}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant={debt.status === "PAID" ? "default" : "outline"}>
                    {debt.status === "PAID" ? "Pagada" : "Activa"}
                  </Badge>
                  {debt.status === "PAID" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                </div>
              </div>
            );
          }}
        />
      </Suspense>
    </div>
  );
}
