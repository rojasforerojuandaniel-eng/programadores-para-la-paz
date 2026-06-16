import { ReactNode } from "react";
import { decimalToNumber } from "@/lib/decimal";
import { getPrisma } from "@/lib/prisma";
import type { UserScope } from "@/lib/scope";
import type { TransactionWhereInput } from "@/generated/prisma/models/Transaction";
import type { LucideIcon } from "lucide-react";
import { KpiCard } from "./kpi-card";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  Target,
  CreditCard,
  ArrowLeftRight,
  HeartPulse,
  FileText,
  Users,
  ShieldCheck,
  Landmark,
} from "lucide-react";

const TREND_MONTHS = 6;
const DELTA_LABEL = "vs mes pasado";

interface KpiItem {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  trend?: number[];
  delta?: number;
  deltaLabel?: string;
  valueClassName?: string;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getMonthRange() {
  const now = new Date();
  return {
    start: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)),
    end: new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)),
  };
}

function getTrendStart(months: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() - (months - 1), 1, 0, 0, 0));
}

function monthBucketIndex(date: Date, start: Date) {
  return (
    (date.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (date.getUTCMonth() - start.getUTCMonth())
  );
}

function buildMonthlySeries<T>(
  items: T[],
  months: number,
  getValue: (item: T) => number,
  filter: (item: T) => boolean,
  getDate: (item: T) => Date
) {
  const start = getTrendStart(months);
  const series = Array.from({ length: months }, () => 0);
  for (const item of items) {
    if (!filter(item)) continue;
    const date = getDate(item);
    if (date < start) continue;
    const idx = monthBucketIndex(date, start);
    if (idx >= 0 && idx < months) {
      series[idx] += getValue(item);
    }
  }
  return series;
}

function computeDelta(series: number[]) {
  if (series.length < 2) return 0;
  const current = series[series.length - 1];
  const previous = series[series.length - 2];
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

interface KpiGridProps {
  scope: UserScope;
  orgId: string;
  userId: string | undefined;
  currency: string;
}

export async function KpiGrid({ scope, orgId, userId, currency }: KpiGridProps) {
  const prisma = getPrisma();
  const { start, end } = getMonthRange();
  const trendStart = getTrendStart(TREND_MONTHS);

  let personalCards: KpiItem[] = [];
  if ((scope === "PERSONAL" || scope === "BOTH") && userId) {
    const txnBaseWhere: TransactionWhereInput = {
      organizationId: orgId,
      scope: "PERSONAL",
      OR: [{ userId }, { userId: null }],
    };
    const [
      accounts,
      incomeAgg,
      expenseAgg,
      budgets,
      goals,
      debts,
      netWorthSnapshot,
      transactionsCount,
      transactionsTrend,
    ] = await Promise.all([
      prisma.account.findMany({ where: { userId }, select: { balance: true } }),
      prisma.transaction.aggregate({
        where: { ...txnBaseWhere, type: "INCOME", date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...txnBaseWhere, type: "EXPENSE", date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.budget.findMany({ where: { userId }, select: { spent: true, amount: true } }),
      prisma.goal.count({ where: { userId, status: "ACTIVE" } }),
      prisma.debt.count({ where: { userId, status: "ACTIVE" } }),
      prisma.netWorthSnapshot.findFirst({
        where: { userId },
        orderBy: { date: "desc" },
        select: { netWorth: true },
      }),
      prisma.transaction.count({
        where: { ...txnBaseWhere, date: { gte: start } },
      }),
      prisma.transaction.findMany({
        where: { ...txnBaseWhere, date: { gte: trendStart } },
        select: { date: true, type: true, amount: true },
      }),
    ]);

    const balanceTotal = accounts.reduce((s, a) => s + decimalToNumber(a.balance), 0);
    const incomeMonth = decimalToNumber(incomeAgg._sum.amount);
    const expenseMonth = decimalToNumber(expenseAgg._sum.amount);
    const budgetTotal = budgets.reduce((s, b) => s + decimalToNumber(b.amount), 0);
    const budgetSpent = budgets.reduce((s, b) => s + decimalToNumber(b.spent), 0);
    const available = Math.max(0, budgetTotal - budgetSpent);

    const incomeSeries = buildMonthlySeries(
      transactionsTrend,
      TREND_MONTHS,
      (t) => decimalToNumber(t.amount),
      (t) => t.type === "INCOME",
      (t) => t.date
    );
    const expenseSeries = buildMonthlySeries(
      transactionsTrend,
      TREND_MONTHS,
      (t) => decimalToNumber(t.amount),
      (t) => t.type === "EXPENSE",
      (t) => t.date
    );
    const transactionsCountSeries = buildMonthlySeries(
      transactionsTrend,
      TREND_MONTHS,
      () => 1,
      () => true,
      (t) => t.date
    );

    personalCards = [
      { label: "Balance Total", value: formatCurrency(balanceTotal, currency), icon: Wallet },
      {
        label: "Patrimonio Neto",
        value: formatCurrency(decimalToNumber(netWorthSnapshot?.netWorth), currency),
        icon: Landmark,
      },
      {
        label: "Ingresos del Mes",
        value: formatCurrency(incomeMonth, currency),
        icon: ArrowUpRight,
        trend: incomeSeries,
        delta: computeDelta(incomeSeries),
        deltaLabel: DELTA_LABEL,
      },
      {
        label: "Gastos del Mes",
        value: formatCurrency(expenseMonth, currency),
        icon: ArrowDownRight,
        trend: expenseSeries,
        delta: computeDelta(expenseSeries),
        deltaLabel: DELTA_LABEL,
      },
      { label: "Disponible para Gastar", value: formatCurrency(available, currency), icon: PiggyBank },
      { label: "Metas Activas", value: goals.toString(), icon: Target },
      { label: "Deudas Pendientes", value: debts.toString(), icon: CreditCard },
      {
        label: "Transacciones del Mes",
        value: transactionsCount.toString(),
        icon: ArrowLeftRight,
        trend: transactionsCountSeries,
        delta: computeDelta(transactionsCountSeries),
        deltaLabel: DELTA_LABEL,
      },
      { label: "Health Score", value: "—", icon: HeartPulse },
    ];
  }

  let businessCards: KpiItem[] = [];
  if (scope === "BUSINESS" || scope === "BOTH") {
    const [invoices, clientsCount, taxesPending, bankAccounts, invoiceCount, clientsTrend] =
      await Promise.all([
        prisma.invoice.findMany({
          where: { organizationId: orgId },
          select: { total: true, status: true, issueDate: true },
        }),
        prisma.client.count({ where: { organizationId: orgId } }),
        prisma.taxReport.count({ where: { organizationId: orgId, status: "PENDING" } }),
        prisma.bankAccount.findMany({
          where: { organizationId: orgId },
          select: { balance: true },
        }),
        prisma.invoice.count({ where: { organizationId: orgId } }),
        prisma.client.findMany({
          where: { organizationId: orgId, createdAt: { gte: trendStart } },
          select: { createdAt: true },
        }),
      ]);

    const totalInvoiced = invoices.reduce((s, i) => s + decimalToNumber(i.total), 0);
    const totalPaid = invoices
      .filter((i) => i.status === "PAID")
      .reduce((s, i) => s + decimalToNumber(i.total), 0);
    const totalPending = invoices
      .filter((i) => i.status === "SENT")
      .reduce((s, i) => s + decimalToNumber(i.total), 0);
    const totalOverdue = invoices
      .filter((i) => i.status === "OVERDUE")
      .reduce((s, i) => s + decimalToNumber(i.total), 0);
    const bankBalance = bankAccounts.reduce((s, b) => s + decimalToNumber(b.balance), 0);

    const invoiceSeries = buildMonthlySeries(
      invoices,
      TREND_MONTHS,
      (i) => decimalToNumber(i.total),
      () => true,
      (i) => i.issueDate
    );
    const paidSeries = buildMonthlySeries(
      invoices,
      TREND_MONTHS,
      (i) => decimalToNumber(i.total),
      (i) => i.status === "PAID",
      (i) => i.issueDate
    );
    const pendingSeries = buildMonthlySeries(
      invoices,
      TREND_MONTHS,
      (i) => decimalToNumber(i.total),
      (i) => i.status === "SENT",
      (i) => i.issueDate
    );
    const overdueSeries = buildMonthlySeries(
      invoices,
      TREND_MONTHS,
      (i) => decimalToNumber(i.total),
      (i) => i.status === "OVERDUE",
      (i) => i.issueDate
    );
    const invoiceCountSeries = buildMonthlySeries(
      invoices,
      TREND_MONTHS,
      () => 1,
      () => true,
      (i) => i.issueDate
    );
    const clientsSeries = buildMonthlySeries(
      clientsTrend,
      TREND_MONTHS,
      () => 1,
      () => true,
      (c) => c.createdAt
    );

    businessCards = [
      {
        label: "Facturado",
        value: formatCurrency(totalInvoiced, currency),
        icon: FileText,
        trend: invoiceSeries,
        delta: computeDelta(invoiceSeries),
        deltaLabel: DELTA_LABEL,
      },
      {
        label: "Cobrado",
        value: formatCurrency(totalPaid, currency),
        icon: ArrowUpRight,
        trend: paidSeries,
        delta: computeDelta(paidSeries),
        deltaLabel: DELTA_LABEL,
      },
      {
        label: "Pendiente",
        value: formatCurrency(totalPending, currency),
        icon: ArrowDownRight,
        trend: pendingSeries,
        delta: computeDelta(pendingSeries),
        deltaLabel: DELTA_LABEL,
      },
      {
        label: "Vencido",
        value: formatCurrency(totalOverdue, currency),
        icon: ArrowDownRight,
        trend: overdueSeries,
        delta: computeDelta(overdueSeries),
        deltaLabel: DELTA_LABEL,
      },
      {
        label: "Clientes",
        value: clientsCount.toString(),
        icon: Users,
        trend: clientsSeries,
        delta: computeDelta(clientsSeries),
        deltaLabel: DELTA_LABEL,
      },
      { label: "Impuestos Pend.", value: taxesPending.toString(), icon: ShieldCheck },
      { label: "Saldo Bancario", value: formatCurrency(bankBalance, currency), icon: Landmark },
      {
        label: "Facturas Totales",
        value: invoiceCount.toString(),
        icon: FileText,
        trend: invoiceCountSeries,
        delta: computeDelta(invoiceCountSeries),
        deltaLabel: DELTA_LABEL,
      },
    ];
  }

  let cards: KpiItem[] = [];
  if (scope === "PERSONAL") {
    cards = personalCards;
  } else if (scope === "BUSINESS") {
    cards = businessCards;
  } else {
    cards = [
      personalCards.find((c) => c.label === "Balance Total") || businessCards[6],
      personalCards.find((c) => c.label === "Ingresos del Mes") || {
        label: "Ingresos del Mes",
        value: "—",
        icon: ArrowUpRight,
      },
      businessCards.find((c) => c.label === "Facturado") || {
        label: "Facturado",
        value: "—",
        icon: FileText,
      },
      businessCards.find((c) => c.label === "Cobrado") || {
        label: "Cobrado",
        value: "—",
        icon: ArrowUpRight,
      },
      personalCards.find((c) => c.label === "Gastos del Mes") || {
        label: "Gastos del Mes",
        value: "—",
        icon: ArrowDownRight,
      },
      businessCards.find((c) => c.label === "Clientes") || {
        label: "Clientes",
        value: "—",
        icon: Users,
      },
      personalCards.find((c) => c.label === "Metas Activas") || {
        label: "Metas Activas",
        value: "—",
        icon: Target,
      },
      businessCards.find((c) => c.label === "Impuestos Pend.") || {
        label: "Impuestos Pend.",
        value: "—",
        icon: ShieldCheck,
      },
    ];
  }

  if (cards.length === 0) {
    cards = Array.from({ length: 8 }).map(() => ({
      label: "—",
      value: "—",
      icon: FileText,
    }));
  }

  const allZero = cards.every(
    (c) => c.value === "—" || c.value === "$0" || c.value === "0" || c.value === "0 COP"
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <KpiCard
          key={card.label}
          label={card.label}
          value={card.value}
          icon={card.icon}
          trend={card.trend}
          delta={card.delta}
          deltaLabel={card.deltaLabel}
          valueClassName={card.valueClassName}
          className={allZero ? "opacity-80" : undefined}
        />
      ))}
    </div>
  );
}
