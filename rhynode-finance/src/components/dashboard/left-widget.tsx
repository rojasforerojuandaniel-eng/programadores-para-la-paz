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
  FileText,
  Plus,
  Receipt,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale } from "@/lib/locale-server";
import { formatCurrency, formatDate as fmtDate } from "@/lib/format";

interface LeftWidgetProps {
  scope: UserScope;
  orgId: string;
  userId: string | undefined;
  currency: string;
}

export async function LeftWidget({ scope, orgId, userId, currency }: LeftWidgetProps) {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.home" });
  const prisma = getPrisma();

  if (scope === "PERSONAL") {
    const txnWhere: TransactionWhereInput = userId
      ? { organizationId: orgId, scope: "PERSONAL", OR: [{ userId }, { userId: null }] }
      : { organizationId: orgId, scope: "PERSONAL" };
    const transactions = await prisma.transaction.findMany({
      where: txnWhere,
      orderBy: { date: "desc" },
      take: 5,
      include: { categoryRef: true },
    });

    const empty = transactions.length === 0;

    return (
      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            {t("leftWidget.latestTransactions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {empty ? (
            <EmptyStateCard
              variant="sm"
              className="border-0 bg-transparent shadow-none"
              icon={Receipt}
              title={t("leftWidget.emptyTransactions.title")}
              description={t("leftWidget.emptyTransactions.description")}
              hint={t("leftWidget.emptyTransactions.hint")}
              action={
                <Link href="/dashboard/transactions">
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    {t("leftWidget.emptyTransactions.action")}
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{txn.description}</p>
                    <p className="body-small text-muted-foreground">
                      {txn.categoryRef?.name || t("leftWidget.uncategorized")} —{" "}
                      {fmtDate(txn.date, locale)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold ${
                      txn.type === "INCOME" ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {txn.type === "INCOME" ? "+" : "-"}
                    {formatCurrency(decimalToNumber(txn.amount), txn.currency || currency, locale)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (scope === "BUSINESS") {
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: orgId },
      select: { status: true },
    });

    const draft = invoices.filter((i) => i.status === "DRAFT").length;
    const sent = invoices.filter((i) => i.status === "SENT").length;
    const paid = invoices.filter((i) => i.status === "PAID").length;
    const overdue = invoices.filter((i) => i.status === "OVERDUE").length;
    const empty = invoices.length === 0;

    return (
      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("leftWidget.invoiceStatus")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {empty ? (
            <EmptyStateCard
              variant="sm"
              className="border-0 bg-transparent shadow-none"
              icon={FileText}
              title={t("leftWidget.emptyInvoices.title")}
              description={t("leftWidget.emptyInvoices.description")}
              hint={t("leftWidget.emptyInvoices.hint")}
              action={
                <Link href="/dashboard/invoices">
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    {t("leftWidget.emptyInvoices.action")}
                  </Button>
                </Link>
              }
            />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="body-default">{t("leftWidget.invoiceStatusLabels.draft")}</span>
                <Badge variant="outline">{draft}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="body-default">{t("leftWidget.invoiceStatusLabels.sent")}</span>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400">
                  {sent}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="body-default">{t("leftWidget.invoiceStatusLabels.paid")}</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400">
                  {paid}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="body-default">{t("leftWidget.invoiceStatusLabels.overdue")}</span>
                <Badge variant="outline" className="bg-red-500/10 text-red-400">
                  {overdue}
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // BOTH
  const [personalTxns, businessInvoices] = await Promise.all([
    prisma.transaction.findMany({
      where: { organizationId: orgId, scope: "PERSONAL" },
      orderBy: { date: "desc" },
      take: 3,
      include: { categoryRef: true },
    }),
    prisma.invoice.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { client: true },
    }),
  ]);

  const empty = personalTxns.length === 0 && businessInvoices.length === 0;

  return (
    <Card className="surface-elevated-2">
      <CardHeader>
        <CardTitle className="heading-card flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4" />
          {t("leftWidget.mixedSummary")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <EmptyStateCard
            variant="sm"
            className="border-0 bg-transparent shadow-none"
            icon={Receipt}
            title={t("leftWidget.emptyMixed.title")}
            description={t("leftWidget.emptyMixed.description")}
            hint={t("leftWidget.emptyMixed.hint")}
            action={
              <Link href="/dashboard/transactions">
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  {t("leftWidget.emptyMixed.action")}
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {personalTxns.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leftWidget.personal")}
                </p>
                {personalTxns.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{txn.description}</p>
                      <p className="body-small text-muted-foreground">
                        {txn.categoryRef?.name || t("leftWidget.uncategorized")} —{" "}
                        {fmtDate(txn.date, locale)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        txn.type === "INCOME" ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {txn.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(decimalToNumber(txn.amount), txn.currency || currency, locale)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {businessInvoices.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leftWidget.business")}
                </p>
                {businessInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {inv.client?.name || t("leftWidget.client")}
                      </p>
                      <p className="body-small text-muted-foreground">
                        {t("leftWidget.invoice")} — {fmtDate(inv.createdAt, locale)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold">
                      {formatCurrency(decimalToNumber(inv.total), inv.currency || currency, locale)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
