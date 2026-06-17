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
import { BankAccountActions } from "@/components/dashboard/bank-account-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Landmark, Wallet, PiggyBank, CreditCard, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BankAccountRow } from "@/components/dashboard/bank-account-actions";

const typeLabels: Record<string, string> = {
  CHECKING: "Corriente",
  SAVINGS: "Ahorros",
  CREDIT: "Crédito",
  VIRTUAL: "Virtual",
};

const typeIcons: Record<string, typeof Building2> = {
  CHECKING: Wallet,
  SAVINGS: PiggyBank,
  CREDIT: CreditCard,
  VIRTUAL: Wallet,
};

const lowBalanceThresholds: Record<string, number> = {
  COP: 100_000,
  MXN: 500,
  BRL: 250,
  USD: 50,
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function accountStatus(amount: number, currency: string) {
  if (amount < 0) return { label: "Negativo", variant: "destructive" as const };
  const threshold = lowBalanceThresholds[currency] ?? 0;
  if (threshold > 0 && amount < threshold) {
    return { label: "Saldo bajo", variant: "warning" as const };
  }
  return null;
}

function bankInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const firstLetters = words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "");
  return firstLetters.join("").slice(0, 2) || "B";
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

  const rows: BankAccountRow[] = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    bankName: account.bankName,
    accountNumber: account.accountNumber ?? "",
    type: account.type as BankAccountRow["type"],
    currency: account.currency as BankAccountRow["currency"],
    balance: decimalToNumber(account.balance),
  }));

  return (
    <CardContent>
      {rows.length === 0 ? (
        <EmptyStateCard
          variant="lg"
          icon={Landmark}
          title="Conecta tus cuentas bancarias"
          description="Visualiza saldos y movimientos de corriente, ahorros, crédito y cuentas virtuales en un solo lugar."
          hint="Empieza conectando tu primera cuenta bancaria."
          action={<CreateBankAccountButton />}
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col">Cuenta</TableHead>
                  <TableHead scope="col">Tipo</TableHead>
                  <TableHead scope="col">Moneda</TableHead>
                  <TableHead scope="col" className="text-right">Saldo</TableHead>
                  <TableHead scope="col" className="w-16">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                          aria-hidden="true"
                        >
                          {bankInitials(acc.bankName)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium">{acc.name}</div>
                          <div className="text-sm text-muted-foreground">{acc.bankName}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeLabels[acc.type] || acc.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{acc.currency}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrency(acc.balance, acc.currency)}
                    </TableCell>
                    <TableCell>
                      <BankAccountActions account={acc} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="grid grid-cols-1 gap-4 md:hidden" role="list">
            {rows.map((acc) => {
              const status = accountStatus(acc.balance, acc.currency);
              const Icon = typeIcons[acc.type] ?? Building2;
              return (
                <li
                  key={acc.id}
                  className="surface-elevated-2 rounded-2xl p-4 sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold leading-snug text-foreground">
                        {acc.name}
                      </div>
                      <div className="text-sm text-muted-foreground">{acc.bankName}</div>
                    </div>
                    <BankAccountActions account={acc} />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{typeLabels[acc.type] || acc.type}</Badge>
                    {status && (
                      <Badge
                        variant={status.variant === "destructive" ? "destructive" : "secondary"}
                        className={cn(
                          status.variant === "warning" &&
                            "border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10"
                        )}
                      >
                        {status.label}
                      </Badge>
                    )}
                  </div>

                  <div
                    className={cn(
                      "mt-3 text-2xl font-bold tracking-tight tabular-nums",
                      acc.balance < 0 && "text-destructive"
                    )}
                  >
                    {formatCurrency(acc.balance, acc.currency)}
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
