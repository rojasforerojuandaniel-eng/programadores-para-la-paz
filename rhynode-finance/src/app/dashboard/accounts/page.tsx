import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateBankAccountButton } from "@/components/dashboard/create-bank-account-button";
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
import { Loader2, Landmark, Wallet, PiggyBank, CreditCard } from "lucide-react";

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  type: string;
  currency: string;
  balance: number;
}

const typeLabels: Record<string, string> = {
  CHECKING: "Corriente",
  SAVINGS: "Ahorros",
  CREDIT: "Crédito",
  VIRTUAL: "Virtual",
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AccountsPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-section">Cuentas Bancarias</h1>
          <p className="body-default mt-1">Gestiona tus cuentas y saldos</p>
        </div>
        <CreateBankAccountButton />
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        }
      >
        <KpiSection />
      </Suspense>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card">Todas las Cuentas</CardTitle>
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
          <AccountsContent />
        </Suspense>
      </Card>
    </div>
  );
}

async function KpiSection() {
  const org = await requireAuth();
  if (!org) return null;

  const prisma = getPrisma();
  const accounts = await prisma.bankAccount.findMany({
    where: { organizationId: org.id },
  });

  const total = accounts.length;
  const checking = accounts.filter((a) => a.type === "CHECKING").length;
  const savings = accounts.filter((a) => a.type === "SAVINGS").length;
  const creditOrVirtual = accounts.filter((a) =>
    ["CREDIT", "VIRTUAL"].includes(a.type)
  ).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      <KpiCard label="Total cuentas" value={total} icon={Landmark} />
      <KpiCard label="Corrientes" value={checking} icon={Wallet} />
      <KpiCard label="Ahorros" value={savings} icon={PiggyBank} />
      <KpiCard label="Crédito / Virtual" value={creditOrVirtual} icon={CreditCard} />
    </div>
  );
}

async function AccountsContent() {
  const org = await requireAuth();
  if (!org) return notFound();

  const prisma = getPrisma();
  const accounts = await prisma.bankAccount.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
  });

  const rows: BankAccount[] = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    bankName: account.bankName,
    type: account.type,
    currency: account.currency,
    balance: decimalToNumber(account.balance),
  }));

  return (
    <CardContent>
      {rows.length === 0 ? (
        <EmptyStateCard
          icon={Landmark}
          title="Conecta tus cuentas bancarias"
          description="Visualiza saldos y movimientos de corriente, ahorros, crédito y cuentas virtuales."
          hint="Empieza conectando tu primera cuenta bancaria."
          action={<CreateBankAccountButton />}
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Moneda</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-medium">{acc.name}</TableCell>
                    <TableCell className="text-sm">{acc.bankName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {typeLabels[acc.type] || acc.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{acc.currency}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(acc.balance, acc.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="grid grid-cols-1 gap-4 md:hidden" role="list">
            {rows.map((acc) => (
              <li key={acc.id} className="surface-elevated-2 rounded-xl p-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{acc.name}</div>
                      <div className="text-sm text-muted-foreground">{acc.bankName}</div>
                    </div>
                    <Badge variant="outline">
                      {typeLabels[acc.type] || acc.type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{acc.currency}</div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(acc.balance, acc.currency)}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </CardContent>
  );
}
