import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/dashboard/data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { TableCell } from "@/components/ui/table";
import { CreateRecurringDialog } from "./create-dialog";
import { Repeat, Calendar, Wallet, Activity } from "lucide-react";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function frequencyLabel(frequency: string) {
  switch (frequency) {
    case "DAILY":
      return "Diario";
    case "WEEKLY":
      return "Semanal";
    case "BIWEEKLY":
      return "Quincenal";
    case "MONTHLY":
      return "Mensual";
    case "QUARTERLY":
      return "Trimestral";
    case "YEARLY":
      return "Anual";
    default:
      return frequency;
  }
}

function EmptyState() {
  return (
    <EmptyStateCard
      icon={Repeat}
      title="No tienes transacciones recurrentes"
      description="Crea tu primera transacción recurrente para automatizar el seguimiento."
      action={<CreateRecurringDialog />}
    />
  );
}

export default async function RecurringPage() {
  const profile = await getUserProfile();
  if (!profile) return null;

  const prisma = getPrisma();
  const recurring = await prisma.recurringTransaction.findMany({
    where: { userId: profile.id },
    include: { category: true, account: true },
    orderBy: { createdAt: "desc" },
  });

  const totalMonthly = recurring
    .filter((r) => r.status === "ACTIVE")
    .reduce((s, r) => s + decimalToNumber(r.amount), 0);
  const activeCount = recurring.filter((r) => r.status === "ACTIVE").length;
  const now = new Date().getTime();
  const nextSevenDays = recurring.filter(
    (r) =>
      r.status === "ACTIVE" &&
      r.nextDueDate &&
      new Date(r.nextDueDate).getTime() - now <= 7 * 24 * 60 * 60 * 1000
  ).length;

  const columns = [
    { key: "name", header: "Nombre" },
    { key: "amount", header: "Monto" },
    { key: "frequency", header: "Frecuencia" },
    { key: "nextDue", header: "Próximo vencimiento" },
    { key: "isSubscription", header: "Suscripción" },
    { key: "status", header: "Estado" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">Recurrentes</h1>
          <p className="body-default mt-1">Administra tus transacciones recurrentes</p>
        </div>
        <CreateRecurringDialog />
      </div>

      {recurring.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Monto mensual" value={formatCurrency(totalMonthly, "COP")} icon={Wallet} />
          <KpiCard label="Activas" value={activeCount} icon={Activity} />
          <KpiCard
            label="Próximos 7 días"
            value={nextSevenDays}
            icon={Calendar}
            valueClassName={nextSevenDays > 0 ? "text-amber-500" : "text-foreground"}
          />
        </div>
      )}

      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <DataTable
          columns={columns}
          data={recurring}
          emptyState={<EmptyState />}
          renderRow={(item) => (
            <>
              <TableCell className="py-3 font-medium">{item.name}</TableCell>
              <TableCell className="py-3">
                {formatCurrency(decimalToNumber(item.amount), item.account?.currency || "COP")}
              </TableCell>
              <TableCell className="py-3">
                <Badge variant="outline">{frequencyLabel(item.frequency)}</Badge>
              </TableCell>
              <TableCell className="py-3">
                {new Date(item.nextDueDate).toLocaleDateString("es-CO")}
              </TableCell>
              <TableCell className="py-3">
                {item.isSubscription ? (
                  <Badge variant="default">Sí</Badge>
                ) : (
                  <Badge variant="outline">No</Badge>
                )}
              </TableCell>
              <TableCell className="py-3">
                <Badge variant={item.status === "ACTIVE" ? "default" : "secondary"}>
                  {item.status === "ACTIVE" ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
            </>
          )}
          renderCard={(item) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium">{item.name}</span>
                <Badge variant={item.status === "ACTIVE" ? "default" : "secondary"}>
                  {item.status === "ACTIVE" ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-muted-foreground">Monto</div>
                <div className="text-right font-medium">
                  {formatCurrency(decimalToNumber(item.amount), item.account?.currency || "COP")}
                </div>
                <div className="text-muted-foreground">Frecuencia</div>
                <div className="text-right">{frequencyLabel(item.frequency)}</div>
                <div className="text-muted-foreground">Próximo</div>
                <div className="text-right">
                  {new Date(item.nextDueDate).toLocaleDateString("es-CO")}
                </div>
                <div className="text-muted-foreground">Suscripción</div>
                <div className="text-right">{item.isSubscription ? "Sí" : "No"}</div>
              </div>
              {item.provider && (
                <p className="text-sm text-muted-foreground">Proveedor: {item.provider}</p>
              )}
            </div>
          )}
        />
      </Suspense>
    </div>
  );
}
