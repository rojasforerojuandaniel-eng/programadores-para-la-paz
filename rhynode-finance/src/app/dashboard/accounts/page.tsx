import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getLocale, type Locale } from "@/lib/locale-server";
import { formatCurrency } from "@/lib/format";
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

function accountStatus(amount: number, currency: string) {
  if (amount < 0) return { labelKey: "negative" as const, variant: "destructive" as const };
  const threshold = lowBalanceThresholds[currency] ?? 0;
  if (threshold > 0 && amount < threshold) {
    return { labelKey: "lowBalance" as const, variant: "warning" as const };
  }
  return null;
}

function bankInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const firstLetters = words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "");
  return firstLetters.join("").slice(0, 2) || "B";
}

export default async function AccountsPage() {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.accounts" });

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">{t("subtitle")}</p>
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
        <KpiSection locale={locale} />
      </Suspense>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card">{t("allTitle")}</CardTitle>
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
          <AccountsContent locale={locale} />
        </Suspense>
      </Card>
    </div>
  );
}

async function KpiSection({ locale }: { locale: Locale }) {
  const org = await requireAuth();
  if (!org) return null;
  setRequestLocale(locale);

  const prisma = getPrisma();
  const accounts = await prisma.bankAccount.findMany({ where: { organizationId: org.id } });

  const total = accounts.length;
  const checking = accounts.filter((a) => a.type === "CHECKING").length;
  const savings = accounts.filter((a) => a.type === "SAVINGS").length;
  const creditOrVirtual = accounts.filter((a) => ["CREDIT", "VIRTUAL"].includes(a.type)).length;

  const t = await getTranslations({ locale, namespace: "dashboard.accounts" });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      <KpiCard label={t("total")} value={total} icon={Landmark} />
      <KpiCard label={t("checking")} value={checking} icon={Wallet} />
      <KpiCard label={t("savings")} value={savings} icon={PiggyBank} />
      <KpiCard label={t("creditVirtual")} value={creditOrVirtual} icon={CreditCard} />
    </div>
  );
}

async function AccountsContent({ locale }: { locale: Locale }) {
  const org = await requireAuth();
  if (!org) return notFound();
  setRequestLocale(locale);

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

  const t = await getTranslations({ locale, namespace: "dashboard.accounts" });

  return (
    <CardContent>
      {rows.length === 0 ? (
        <EmptyStateCard
          variant="lg"
          icon={Landmark}
          title={t("empty.title")}
          description={t("empty.description")}
          hint={t("empty.hint")}
          action={<CreateBankAccountButton />}
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col">{t("table.account")}</TableHead>
                  <TableHead scope="col">{t("table.type")}</TableHead>
                  <TableHead scope="col">{t("table.currency")}</TableHead>
                  <TableHead scope="col" className="text-right">{t("table.balance")}</TableHead>
                  <TableHead scope="col" className="w-16">
                    <span className="sr-only">{t("table.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary" aria-hidden="true">
                          {bankInitials(acc.bankName)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium">{acc.name}</div>
                          <div className="text-sm text-muted-foreground">{acc.bankName}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(`types.${acc.type}` as never) || acc.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{acc.currency}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrency(acc.balance, acc.currency, locale)}
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
                <li key={acc.id} className="surface-elevated-2 rounded-2xl p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold leading-snug text-foreground">{acc.name}</div>
                      <div className="text-sm text-muted-foreground">{acc.bankName}</div>
                    </div>
                    <BankAccountActions account={acc} />
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{t(`types.${acc.type}` as never) || acc.type}</Badge>
                    {status && (
                      <Badge
                        variant={status.variant === "destructive" ? "destructive" : "secondary"}
                        className={cn(
                          status.variant === "warning" &&
                            "border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10",
                        )}
                      >
                        {t(`status.${status.labelKey}` as never)}
                      </Badge>
                    )}
                  </div>

                  <div
                    className={cn(
                      "mt-3 text-2xl font-bold tracking-tight tabular-nums",
                      acc.balance < 0 && "text-destructive",
                    )}
                  >
                    {formatCurrency(acc.balance, acc.currency, locale)}
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