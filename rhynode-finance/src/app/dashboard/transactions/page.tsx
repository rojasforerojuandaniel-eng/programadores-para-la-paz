import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import type { UserScope } from "@/lib/scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateTransactionButton } from "@/components/dashboard/create-transaction-button";
import { DeleteButton } from "@/components/dashboard/delete-button";
import { ExportButtons } from "@/components/dashboard/export-buttons";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowLeftRight, TrendingUp, TrendingDown, Scale } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  type: string;
  category?: string;
  description: string;
  amount: number;
  currency: string;
}

function scopeFilter(scope: UserScope) {
  if (scope === "PERSONAL") return { scope: "PERSONAL" };
  if (scope === "BUSINESS") return { scope: "BUSINESS" };
  return { scope: { in: ["PERSONAL", "BUSINESS"] } };
}

const typeConfig: Record<string, { label: string; className: string }> = {
  INCOME: { label: "Ingreso", className: "bg-emerald-500/10 text-emerald-400" },
  EXPENSE: { label: "Gasto", className: "bg-red-500/10 text-red-400" },
  TRANSFER: { label: "Transferencia", className: "bg-blue-500/10 text-blue-400" },
  ADJUSTMENT: { label: "Ajuste", className: "bg-gray-500/10 text-gray-400" },
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function TransactionsPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-section">Transacciones</h1>
          <p className="body-default mt-1">Registro de ingresos, gastos y movimientos</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <ExportButtons />
          <CreateTransactionButton />
        </div>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        }
      >
        <KpiSection />
      </Suspense>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card">Todas las Transacciones</CardTitle>
        </CardHeader>
        <Suspense
          fallback={
            <CardContent>
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            </CardContent>
          }
        >
          <TransactionsContent />
        </Suspense>
      </Card>
    </div>
  );
}

async function KpiSection() {
  const org = await requireAuth();
  if (!org) return null;

  const profile = await getUserProfile();
  const scope = (profile?.scope ?? "PERSONAL") as UserScope;

  const prisma = getPrisma();
  const transactions = await prisma.transaction.findMany({
    where: { organizationId: org.id, ...scopeFilter(scope) },
  });

  const income = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + decimalToNumber(t.amount), 0);
  const expense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + decimalToNumber(t.amount), 0);
  const balance = income - expense;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      <KpiCard
        label="Ingresos"
        value={formatCurrency(income, org.currency)}
        icon={TrendingUp}
        valueClassName="text-emerald-400"
      />
      <KpiCard
        label="Gastos"
        value={formatCurrency(expense, org.currency)}
        icon={TrendingDown}
        valueClassName="text-rose-400"
      />
      <KpiCard
        label="Balance"
        value={formatCurrency(balance, org.currency)}
        icon={Scale}
        valueClassName={balance >= 0 ? "text-emerald-400" : "text-rose-400"}
      />
    </div>
  );
}

async function TransactionsContent() {
  const org = await requireAuth();
  if (!org) return notFound();

  const profile = await getUserProfile();
  const scope = (profile?.scope ?? "PERSONAL") as UserScope;

  const prisma = getPrisma();
  const transactions = await prisma.transaction.findMany({
    where: { organizationId: org.id, ...scopeFilter(scope) },
    orderBy: { date: "desc" },
  });

  const rows: Transaction[] = transactions.map((tx) => ({
    id: tx.id,
    date: tx.date.toISOString(),
    type: tx.type,
    category: tx.category ?? undefined,
    description: tx.description,
    amount: decimalToNumber(tx.amount),
    currency: tx.currency,
  }));

  return (
    <CardContent>
      {rows.length === 0 ? (
        <EmptyStateCard
          icon={ArrowLeftRight}
          title="No hay transacciones"
          description="Registra tus ingresos y gastos para llevar el control financiero."
          action={<CreateTransactionButton />}
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((tx) => {
                  const t = typeConfig[tx.type] || typeConfig.ADJUSTMENT;
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(tx.date).toLocaleDateString("es-CO")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={t.className}>
                          {t.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{tx.category || "—"}</TableCell>
                      <TableCell className="max-w-xs truncate">{tx.description}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          tx.type === "INCOME"
                            ? "text-emerald-400"
                            : tx.type === "EXPENSE"
                            ? "text-red-400"
                            : ""
                        }`}
                      >
                        {formatCurrency(tx.amount, tx.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DeleteButton
                          endpoint={`/api/transactions/${tx.id}`}
                          confirmMessage="¿Eliminar esta transacción permanentemente?"
                          title="Eliminar transacción"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="grid grid-cols-1 gap-4 md:hidden" role="list">
            {rows.map((tx) => {
              const t = typeConfig[tx.type] || typeConfig.ADJUSTMENT;
              return (
                <li key={tx.id} className="surface-elevated-2 rounded-xl p-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm text-muted-foreground">
                          {new Date(tx.date).toLocaleDateString("es-CO")}
                        </div>
                        <div className="font-medium">{tx.description}</div>
                      </div>
                      <Badge variant="outline" className={t.className}>
                        {t.label}
                      </Badge>
                    </div>
                    {tx.category && (
                      <div className="text-sm text-muted-foreground">{tx.category}</div>
                    )}
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <div
                        className={`text-lg font-semibold ${
                          tx.type === "INCOME"
                            ? "text-emerald-400"
                            : tx.type === "EXPENSE"
                            ? "text-red-400"
                            : ""
                        }`}
                      >
                        {formatCurrency(tx.amount, tx.currency)}
                      </div>
                      <DeleteButton
                        endpoint={`/api/transactions/${tx.id}`}
                        confirmMessage="¿Eliminar esta transacción permanentemente?"
                        title="Eliminar transacción"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </CardContent>
  );
}
