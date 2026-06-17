import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServerDataTable } from "@/components/dashboard/server-data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { TableCell } from "@/components/ui/table";
import { CreateDebtDialog } from "./create-dialog";
import { RecordPaymentDialog } from "./record-payment-dialog";
import {
  Scale,
  AlertTriangle,
  Wallet,
  CheckCircle2,
  CalendarClock,
  Landmark,
  ArrowRight,
} from "lucide-react";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function isOverdue(dueDate: Date | null, status: string) {
  return status !== "PAID" && dueDate instanceof Date && dueDate < new Date();
}

function isUpcoming(dueDate: Date | null, status: string) {
  if (status === "PAID" || !dueDate) return false;
  const daysUntil = Math.ceil(
    (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return daysUntil >= 0 && daysUntil <= 7;
}

function paymentProgress(principal: number, remaining: number) {
  if (principal <= 0) return 0;
  const paid = principal - remaining;
  return Math.min(100, Math.max(0, (paid / principal) * 100));
}

function debtStatusBadge(status: string, overdue: boolean) {
  if (status === "PAID") {
    return { label: "Pagada", variant: "default" as const, className: "" };
  }
  if (overdue) {
    return {
      label: "Vencida",
      variant: "outline" as const,
      className:
        "bg-danger/10 text-danger border-danger/20 hover:bg-danger/15",
    };
  }
  return {
    label: "Activa",
    variant: "outline" as const,
    className: "text-foreground",
  };
}

function EmptyState() {
  return (
    <EmptyStateCard
      variant="md"
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
  const overdueCount = debts.filter((d) =>
    isOverdue(d.dueDate ? new Date(d.dueDate) : null, d.status)
  ).length;

  const columns = [
    { key: "name", header: "Nombre" },
    { key: "type", header: "Tipo" },
    { key: "counterparty", header: "Acreedor" },
    { key: "remaining", header: "Restante" },
    { key: "progress", header: "Progreso" },
    { key: "dueDate", header: "Próximo vencimiento" },
    { key: "status", header: "Estado" },
    { key: "action", header: "" },
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
            valueClassName="text-danger"
          />
          <KpiCard label="Activas" value={activeCount} icon={Scale} />
          <KpiCard
            label="Vencidas"
            value={overdueCount}
            icon={AlertTriangle}
            valueClassName={overdueCount > 0 ? "text-warning" : "text-foreground"}
          />
        </div>
      )}

      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <ServerDataTable
          columns={columns}
          data={debts}
          emptyState={<EmptyState />}
          renderRow={(debt) => {
            const remaining = decimalToNumber(debt.remainingAmount);
            const principal = decimalToNumber(debt.principalAmount);
            const progress = paymentProgress(principal, remaining);
            const dueDate = debt.dueDate ? new Date(debt.dueDate) : null;
            const overdue = isOverdue(dueDate, debt.status);
            const upcoming = isUpcoming(dueDate, debt.status);
            const status = debtStatusBadge(debt.status, overdue);
            const isPaid = debt.status === "PAID";

            return (
              <>
                <TableCell className="py-3 font-medium">{debt.name}</TableCell>
                <TableCell className="py-3">
                  <Badge variant={debt.type === "OWE" ? "destructive" : "default"}>
                    {debt.type === "OWE" ? "Debo" : "Me deben"}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 text-muted-foreground">
                  {debt.counterparty || "—"}
                </TableCell>
                <TableCell className="py-3 font-semibold">
                  {formatCurrency(remaining, debt.currency)}
                </TableCell>
                <TableCell className="py-3">
                  <div className="w-full max-w-[140px]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{Math.round(progress)}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-success transition-all"
                        style={{ width: `${progress}%` }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  {dueDate ? (
                    <span
                      className={`inline-flex items-center gap-1 ${
                        overdue ? "text-warning font-medium" : "text-muted-foreground"
                      }`}
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                      {formatShortDate(dueDate)}
                      {overdue && " · vencida"}
                      {!overdue && upcoming && " · próxima"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant={status.variant} className={status.className}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 text-right">
                  {!isPaid && (
                    <RecordPaymentDialog
                      debtId={debt.id}
                      debtName={debt.name}
                      remaining={remaining}
                      currency={debt.currency}
                      trigger={
                        <Button variant="outline" size="sm" className="gap-2">
                          <ArrowRight className="h-4 w-4" />
                          Pagar
                        </Button>
                      }
                    />
                  )}
                  {isPaid && (
                    <CheckCircle2 className="ml-auto h-5 w-5 text-success" aria-label="Pagada" />
                  )}
                </TableCell>
              </>
            );
          }}
          renderCard={(debt) => {
            const remaining = decimalToNumber(debt.remainingAmount);
            const principal = decimalToNumber(debt.principalAmount);
            const progress = paymentProgress(principal, remaining);
            const dueDate = debt.dueDate ? new Date(debt.dueDate) : null;
            const overdue = isOverdue(dueDate, debt.status);
            const upcoming = isUpcoming(dueDate, debt.status);
            const status = debtStatusBadge(debt.status, overdue);
            const isPaid = debt.status === "PAID";

            return (
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight">{debt.name}</p>
                    {debt.counterparty ? (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Landmark className="h-3 w-3" />
                        {debt.counterparty}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={debt.type === "OWE" ? "destructive" : "default"}>
                    {debt.type === "OWE" ? "Debo" : "Me deben"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="text-muted-foreground">Saldo restante</div>
                  <div className="text-right font-semibold">
                    {formatCurrency(remaining, debt.currency)}
                  </div>

                  <div className="text-muted-foreground">Progreso</div>
                  <div className="text-right font-medium">{Math.round(progress)}% pagado</div>
                </div>

                <div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-success transition-all"
                      style={{ width: `${progress}%` }}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(principal - remaining, debt.currency)} de{" "}
                    {formatCurrency(principal, debt.currency)}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={status.variant} className={status.className}>
                      {status.label}
                    </Badge>
                    {overdue && <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />}
                    {upcoming && !overdue && (
                      <CalendarClock className="h-4 w-4 text-info" aria-hidden="true" />
                    )}
                  </div>
                  <span
                    className={`text-xs ${
                      overdue ? "text-warning font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {dueDate ? formatShortDate(dueDate) : "Sin vencimiento"}
                    {overdue && " · vencida"}
                    {!overdue && upcoming && " · próxima"}
                  </span>
                </div>

                {!isPaid && (
                  <RecordPaymentDialog
                    debtId={debt.id}
                    debtName={debt.name}
                    remaining={remaining}
                    currency={debt.currency}
                    trigger={
                      <Button variant="outline" className="w-full gap-2">
                        <ArrowRight className="h-4 w-4" />
                        Registrar pago
                      </Button>
                    }
                  />
                )}
                {isPaid && (
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 py-2 text-sm font-medium text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    Deuda saldada
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
