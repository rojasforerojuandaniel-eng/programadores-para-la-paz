import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import type { UserScope } from "@/lib/scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { DeleteButton } from "@/components/dashboard/delete-button";
import { ExportButtons } from "@/components/dashboard/export-buttons";

const CreateTransactionButton = dynamic(
  () =>
    import("@/components/dashboard/create-transaction-button").then(
      (mod) => mod.CreateTransactionButton,
    ),
  {
    loading: () => (
      <Button className="gap-2" disabled>
        <Plus className="h-4 w-4" />
        Nueva Transacción
      </Button>
    ),
  },
);

const BankImportRefreshButton = dynamic(
  () =>
    import("@/components/dashboard/bank-import-dialog").then(
      (mod) => mod.BankImportRefreshButton,
    ),
  {
    loading: () => (
      <Button variant="outline" className="gap-2" disabled>
        <Upload className="h-4 w-4" />
        Importar
      </Button>
    ),
  },
);
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
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  Upload,
} from "lucide-react";
import {
  KpiSkeleton,
  TableRowsSkeleton,
} from "@/components/dashboard/page-skeleton";

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
  INCOME: { label: "Ingreso", className: "bg-success/10 text-success" },
  EXPENSE: { label: "Gasto", className: "bg-danger/10 text-danger" },
  TRANSFER: { label: "Transferencia", className: "bg-info/10 text-info" },
  ADJUSTMENT: { label: "Ajuste", className: "bg-muted text-muted-foreground" },
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
      <Suspense
        fallback={<div className="h-16 animate-pulse rounded-xl bg-muted" />}
      >
        <HeaderSection />
      </Suspense>

      <Suspense fallback={<KpiSkeleton count={3} columns={3} />}>
        <KpiSection />
      </Suspense>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card">
            Todas las Transacciones
          </CardTitle>
        </CardHeader>
        <Suspense
          fallback={
            <CardContent className="space-y-4">
              <TableRowsSkeleton rows={5} />
            </CardContent>
          }
        >
          <TransactionsContent />
        </Suspense>
      </Card>
    </div>
  );
}

async function HeaderSection() {
  const org = await requireAuth();
  const bankAccounts = org
    ? await getPrisma().bankAccount.findMany({
        where: { organizationId: org.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true, bankName: true },
      })
    : [];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="heading-section">Transacciones</h1>
        <p className="body-default mt-1">
          Registro de ingresos, gastos y movimientos
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <ExportButtons />
        <BankImportRefreshButton bankAccounts={bankAccounts} />
        <CreateTransactionButton />
      </div>
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
        valueClassName="text-success"
      />
      <KpiCard
        label="Gastos"
        value={formatCurrency(expense, org.currency)}
        icon={TrendingDown}
        valueClassName="text-danger"
      />
      <KpiCard
        label="Balance"
        value={formatCurrency(balance, org.currency)}
        icon={Scale}
        valueClassName={balance >= 0 ? "text-success" : "text-danger"}
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
          variant="lg"
          icon={ArrowLeftRight}
          title="El centro de tus finanzas"
          description="Registra ingresos, gastos y transferencias para tomar decisiones con datos reales."
          hint="Empieza creando tu primera transacción."
          action={<CreateTransactionButton />}
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col">Fecha</TableHead>
                  <TableHead scope="col">Tipo</TableHead>
                  <TableHead scope="col">Categoría</TableHead>
                  <TableHead scope="col">Descripción</TableHead>
                  <TableHead scope="col" className="text-right">
                    Monto
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Acciones
                  </TableHead>
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
                      <TableCell className="text-sm">
                        {tx.category || "—"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {tx.description}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          tx.type === "INCOME"
                            ? "text-success"
                            : tx.type === "EXPENSE"
                              ? "text-danger"
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
                      <div className="text-sm text-muted-foreground">
                        {tx.category}
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <div
                        className={`text-lg font-semibold ${
                          tx.type === "INCOME"
                            ? "text-success"
                            : tx.type === "EXPENSE"
                              ? "text-danger"
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
