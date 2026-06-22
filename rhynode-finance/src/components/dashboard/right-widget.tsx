import { decimalToNumber } from "@/lib/decimal";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import type { UserScope } from "@/lib/scope";
import type { TransactionWhereInput } from "@/generated/prisma/models/Transaction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import {
  ArrowLeftRight,
  Plus,
  Receipt,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale } from "@/lib/locale-server";
import { formatCurrency, formatDate as fmtDate } from "@/lib/format";

interface RightWidgetProps {
  scope: UserScope;
  orgId: string;
  userId: string | undefined;
  currency: string;
}

export async function RightWidget({ scope, orgId, userId, currency }: RightWidgetProps) {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.home" });
  const prisma = getPrisma();

  if (scope === "PERSONAL") {
    const budgets = userId
      ? await prisma.budget.findMany({
          where: { userId },
          include: { category: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : [];

    const empty = budgets.length === 0;

    return (
      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t("rightWidget.monthlyBudgets")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {empty ? (
            <EmptyStateCard
              variant="sm"
              className="border-0 bg-transparent shadow-none"
              icon={TrendingUp}
              title={t("rightWidget.emptyBudgets.title")}
              description={t("rightWidget.emptyBudgets.description")}
              hint={t("rightWidget.emptyBudgets.hint")}
              action={
                <Link href="/dashboard/personal/budgets">
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    {t("rightWidget.emptyBudgets.action")}
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-4">
              {budgets.map((b) => {
                const pct = decimalToNumber(b.amount) > 0 ? Math.min((decimalToNumber(b.spent) / decimalToNumber(b.amount)) * 100, 100) : 0;
                return (
                  <div key={b.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {b.category?.name || b.name}
                      </span>
                      <span className="body-small text-muted-foreground">
                        {formatCurrency(decimalToNumber(b.spent), currency, locale)} / {formatCurrency(decimalToNumber(b.amount), currency, locale)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (scope === "BUSINESS") {
    const taxes = await prisma.taxReport.findMany({
      where: { organizationId: orgId, status: "PENDING" },
      orderBy: { dueDate: "asc" },
      take: 5,
    });

    const empty = taxes.length === 0;

    return (
      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {t("rightWidget.upcomingDueDates")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {empty ? (
            <EmptyStateCard
              variant="sm"
              className="border-0 bg-transparent shadow-none"
              icon={ShieldCheck}
              title={t("rightWidget.emptyTaxes.title")}
              description={t("rightWidget.emptyTaxes.description")}
              hint={t("rightWidget.emptyTaxes.hint")}
              action={
                <Link href="/dashboard/tax">
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    {t("rightWidget.emptyTaxes.action")}
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {taxes.map((tax) => (
                <div
                  key={tax.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <span className="text-sm">
                    {tax.type} — {tax.period} {tax.year}
                    {tax.month ? ` / ${tax.month}` : ""}
                  </span>
                  <Badge variant="outline">
                    {tax.dueDate
                      ? t("rightWidget.due", { date: fmtDate(tax.dueDate, locale) })
                      : t("rightWidget.pending")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // BOTH: Actividad Reciente (mezcla de transacciones y facturas)
  const txnWhere: TransactionWhereInput = userId
    ? { organizationId: orgId, scope: "PERSONAL", OR: [{ userId }, { userId: null }] }
    : { organizationId: orgId, scope: "PERSONAL" };
  const [transactions, invoices] = await Promise.all([
    prisma.transaction.findMany({
      where: txnWhere,
      orderBy: { date: "desc" },
      take: 5,
      include: { categoryRef: true },
    }),
    prisma.invoice.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: true },
    }),
  ]);

  const mixed = [
    ...transactions.map((txn) => ({
      id: txn.id,
      type: "transaction" as const,
      title: txn.description,
      subtitle: txn.categoryRef?.name || t("rightWidget.uncategorized"),
      date: txn.date,
      amount: txn.amount,
      currency: txn.currency || currency,
      income: txn.type === "INCOME",
    })),
    ...invoices.map((inv) => ({
      id: inv.id,
      type: "invoice" as const,
      title: inv.client?.name || t("rightWidget.client"),
      subtitle: t("rightWidget.invoice"),
      date: inv.createdAt,
      amount: inv.total,
      currency: inv.currency || currency,
      income: true,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

  const empty = mixed.length === 0;

  return (
    <Card className="surface-elevated-2">
      <CardHeader>
        <CardTitle className="heading-card flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4" />
          {t("rightWidget.recentActivity")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <EmptyStateCard
            variant="sm"
            className="border-0 bg-transparent shadow-none"
            icon={Receipt}
            title={t("rightWidget.emptyMixed.title")}
            description={t("rightWidget.emptyMixed.description")}
            hint={t("rightWidget.emptyMixed.hint")}
            action={
              <Link href="/dashboard/transactions">
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  {t("rightWidget.emptyMixed.action")}
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {mixed.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="body-small text-muted-foreground">
                    {item.subtitle} — {fmtDate(item.date, locale)}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold ${
                    item.income ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {item.income ? "+" : "-"}
                  {formatCurrency(decimalToNumber(item.amount), item.currency, locale)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
