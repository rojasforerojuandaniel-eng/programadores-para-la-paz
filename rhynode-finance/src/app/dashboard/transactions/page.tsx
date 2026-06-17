import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import type { UserScope } from "@/lib/scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { ExportButtons } from "@/components/dashboard/export-buttons";
import {
  TransactionsList,
  type Transaction,
} from "@/components/dashboard/transactions-list";

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
import {
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

function scopeFilter(scope: UserScope) {
  if (scope === "PERSONAL") return { scope: "PERSONAL" };
  if (scope === "BUSINESS") return { scope: "BUSINESS" };
  return { scope: { in: ["PERSONAL", "BUSINESS"] } };
}

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
    include: {
      bankAccount: { select: { name: true } },
    },
  });

  const rows: Transaction[] = transactions.map((tx) => ({
    id: tx.id,
    date: tx.date.toISOString(),
    type: tx.type as Transaction["type"],
    category: tx.category ?? undefined,
    description: tx.description,
    amount: decimalToNumber(tx.amount),
    currency: tx.currency,
    isRecurring: tx.isRecurring,
    bankAccountName: tx.bankAccount?.name,
  }));

  return <TransactionsList transactions={rows} orgCurrency={org.currency} />;
}
