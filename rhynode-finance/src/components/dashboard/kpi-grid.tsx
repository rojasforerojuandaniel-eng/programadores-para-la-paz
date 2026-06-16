import { decimalToNumber } from "@/lib/decimal";
import { getPrisma } from "@/lib/prisma";
import type { UserScope } from "@/lib/scope";
import type { TransactionWhereInput } from "@/generated/prisma/models/Transaction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface KpiGridProps {
  scope: UserScope;
  orgId: string;
  userId: string | undefined;
  currency: string;
}

export async function KpiGrid({ scope, orgId, userId, currency }: KpiGridProps) {
  const prisma = getPrisma();
  const { start, end } = getMonthRange();

  // Personal data
  let personalCards: Array<{ title: string; value: string; icon: React.ElementType }> = [];
  if ((scope === "PERSONAL" || scope === "BOTH") && userId) {
    const txnBaseWhere: TransactionWhereInput = { organizationId: orgId, scope: "PERSONAL", OR: [{ userId }, { userId: null }] };
    const [accounts, incomeAgg, expenseAgg, budgets, goals, debts, netWorthSnapshot, transactionsCount] =
      await Promise.all([
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
        prisma.netWorthSnapshot.findFirst({ where: { userId }, orderBy: { date: "desc" }, select: { netWorth: true } }),
        prisma.transaction.count({
          where: { ...txnBaseWhere, date: { gte: start } },
        }),
      ]);

    const balanceTotal = accounts.reduce((s, a) => s + decimalToNumber(a.balance), 0);
    const incomeMonth = decimalToNumber(incomeAgg._sum.amount);
    const expenseMonth = decimalToNumber(expenseAgg._sum.amount);
    const budgetTotal = budgets.reduce((s, b) => s + decimalToNumber(b.amount), 0);
    const budgetSpent = budgets.reduce((s, b) => s + decimalToNumber(b.spent), 0);
    const available = Math.max(0, budgetTotal - budgetSpent);

    personalCards = [
      { title: "Balance Total", value: formatCurrency(balanceTotal, currency), icon: Wallet },
      { title: "Patrimonio Neto", value: formatCurrency(decimalToNumber(netWorthSnapshot?.netWorth), currency), icon: Landmark },
      { title: "Ingresos del Mes", value: formatCurrency(incomeMonth, currency), icon: ArrowUpRight },
      { title: "Gastos del Mes", value: formatCurrency(expenseMonth, currency), icon: ArrowDownRight },
      { title: "Disponible para Gastar", value: formatCurrency(available, currency), icon: PiggyBank },
      { title: "Metas Activas", value: goals.toString(), icon: Target },
      { title: "Deudas Pendientes", value: debts.toString(), icon: CreditCard },
      { title: "Transacciones del Mes", value: transactionsCount.toString(), icon: ArrowLeftRight },
      { title: "Health Score", value: "—", icon: HeartPulse },
    ];
  }

  // Business data
  let businessCards: Array<{ title: string; value: string; icon: React.ElementType }> = [];
  if (scope === "BUSINESS" || scope === "BOTH") {
    const [invoices, clientsCount, taxesPending, bankAccounts, invoiceCount] = await Promise.all([
      prisma.invoice.findMany({
        where: { organizationId: orgId },
        select: { total: true, status: true },
      }),
      prisma.client.count({ where: { organizationId: orgId } }),
      prisma.taxReport.count({ where: { organizationId: orgId, status: "PENDING" } }),
      prisma.bankAccount.findMany({
        where: { organizationId: orgId },
        select: { balance: true },
      }),
      prisma.invoice.count({ where: { organizationId: orgId } }),
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

    businessCards = [
      { title: "Facturado", value: formatCurrency(totalInvoiced, currency), icon: FileText },
      { title: "Cobrado", value: formatCurrency(totalPaid, currency), icon: ArrowUpRight },
      { title: "Pendiente", value: formatCurrency(totalPending, currency), icon: ArrowDownRight },
      { title: "Vencido", value: formatCurrency(totalOverdue, currency), icon: ArrowDownRight },
      { title: "Clientes", value: clientsCount.toString(), icon: Users },
      { title: "Impuestos Pend.", value: taxesPending.toString(), icon: ShieldCheck },
      { title: "Saldo Bancario", value: formatCurrency(bankBalance, currency), icon: Landmark },
      { title: "Facturas Totales", value: invoiceCount.toString(), icon: FileText },
    ];
  }

  let cards: Array<{ title: string; value: string; icon: React.ElementType }> = [];
  if (scope === "PERSONAL") {
    cards = personalCards;
  } else if (scope === "BUSINESS") {
    cards = businessCards;
  } else {
    // BOTH: mix of 8 most relevant
    cards = [
      personalCards.find((c) => c.title === "Balance Total") || businessCards[6],
      personalCards.find((c) => c.title === "Ingresos del Mes") || { title: "Ingresos del Mes", value: "—", icon: ArrowUpRight },
      businessCards.find((c) => c.title === "Facturado") || { title: "Facturado", value: "—", icon: FileText },
      businessCards.find((c) => c.title === "Cobrado") || { title: "Cobrado", value: "—", icon: ArrowUpRight },
      personalCards.find((c) => c.title === "Gastos del Mes") || { title: "Gastos del Mes", value: "—", icon: ArrowDownRight },
      businessCards.find((c) => c.title === "Clientes") || { title: "Clientes", value: "—", icon: Users },
      personalCards.find((c) => c.title === "Metas Activas") || { title: "Metas Activas", value: "—", icon: Target },
      businessCards.find((c) => c.title === "Impuestos Pend.") || { title: "Impuestos Pend.", value: "—", icon: ShieldCheck },
    ];
  }

  if (cards.length === 0) {
    cards = Array.from({ length: 8 }).map(() => ({
      title: "—",
      value: "—",
      icon: FileText,
    }));
  }

  const allZero = cards.every(
    (c) => c.value === "—" || c.value === "$0" || c.value === "0" || c.value === "0 COP"
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className={`surface-elevated-2 ${allZero ? "opacity-80" : ""}`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                {card.title}
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
