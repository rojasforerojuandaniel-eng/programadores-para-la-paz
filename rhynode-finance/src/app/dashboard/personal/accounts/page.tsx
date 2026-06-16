import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { dashboardMetadata } from "@/lib/dashboard-metadata";
import { Badge } from "@/components/ui/badge";
import { ServerDataTable } from "@/components/dashboard/server-data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { TableCell } from "@/components/ui/table";
import { CreateAccountDialog } from "./create-dialog";
import { Wallet, Landmark } from "lucide-react";

export const metadata = dashboardMetadata(
  "Cuentas",
  "Administra tus cuentas bancarias, efectivo, tarjetas e inversiones personales en Rhynode."
);

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
      icon={Wallet}
      title="No tienes cuentas"
      description="Crea tu primera cuenta para consolidar tus saldos."
      action={<CreateAccountDialog />}
    />
  );
}

export default async function AccountsPage() {
  const profile = await getUserProfile();
  if (!profile) return null;

  const prisma = getPrisma();
  const accounts = await prisma.account.findMany({
    where: { userId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  const totalBalance = accounts.reduce((s, a) => s + decimalToNumber(a.balance), 0);

  const columns = [
    { key: "name", header: "Nombre" },
    { key: "type", header: "Tipo" },
    { key: "balance", header: "Saldo" },
    { key: "currency", header: "Moneda" },
    { key: "color", header: "Color" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">Cuentas</h1>
          <p className="body-default mt-1">Administra tus cuentas personales</p>
        </div>
        <CreateAccountDialog />
      </div>

      {accounts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiCard
            label="Saldo total"
            value={formatCurrency(totalBalance, "COP")}
            icon={Landmark}
          />
          <KpiCard label="Cuentas" value={accounts.length} icon={Wallet} />
        </div>
      )}

      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <ServerDataTable
          columns={columns}
          data={accounts}
          emptyState={<EmptyState />}
          renderRow={(account) => (
            <>
              <TableCell className="py-3 font-medium">{account.name}</TableCell>
              <TableCell className="py-3">
                <Badge variant="outline">{account.type}</Badge>
              </TableCell>
              <TableCell className="py-3 font-medium">
                {formatCurrency(decimalToNumber(account.balance), account.currency)}
              </TableCell>
              <TableCell className="py-3 text-muted-foreground">{account.currency}</TableCell>
              <TableCell className="py-3">
                {account.color ? (
                  <span
                    className="inline-block h-4 w-4 rounded-full"
                    style={{ backgroundColor: account.color }}
                  />
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </>
          )}
          renderCard={(account) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {account.color ? (
                    <span
                      className="inline-block h-4 w-4 rounded-full"
                      style={{ backgroundColor: account.color }}
                    />
                  ) : (
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[9px] text-muted-foreground">-</span>
                  )}
                  <span className="font-medium">{account.name}</span>
                </div>
                <Badge variant="outline">{account.type}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-muted-foreground">Saldo</div>
                <div className="text-right font-semibold">
                  {formatCurrency(decimalToNumber(account.balance), account.currency)}
                </div>
                <div className="text-muted-foreground">Moneda</div>
                <div className="text-right text-muted-foreground">{account.currency}</div>
              </div>
            </div>
          )}
        />
      </Suspense>
    </div>
  );
}
