import { getPrisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { decimalToNumber } from "@/lib/decimal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Lightbulb, ArrowRight, TrendingUp, AlertTriangle, PiggyBank } from "lucide-react";

interface Insight {
  id: string;
  type: "positive" | "warning" | "tip";
  title: string;
  description: string;
  action?: { label: string; href: string };
}

function getMonthRange() {
  const now = new Date();
  return {
    start: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)),
    end: new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)),
  };
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function SmartInsights({ currency }: { currency: string }) {
  const profile = await getUserProfile();
  const userId = profile?.id;

  if (!userId) return null;

  const prisma = getPrisma();
  const { start, end } = getMonthRange();
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [transactions, budgets, goals, debts, subscriptions, investments] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { userId, date: { gte: start, lte: end } },
        select: { type: true, amount: true },
      }),
      prisma.budget.findMany({
        where: { userId },
        select: { name: true, amount: true, spent: true },
      }),
      prisma.goal.findMany({
        where: { userId, status: "ACTIVE" },
        select: { name: true, targetAmount: true, currentAmount: true, currency: true },
      }),
      prisma.debt.findMany({
        where: { userId, status: "ACTIVE" },
        select: { name: true, remainingAmount: true, dueDate: true },
      }),
      prisma.recurringTransaction.findMany({
        where: { userId, status: "ACTIVE", type: "EXPENSE" },
        select: { name: true, amount: true },
      }),
      prisma.investment.findMany({
        where: { userId },
        select: { name: true, balance: true, investedAmount: true },
      }),
    ]);

  const income = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + decimalToNumber(t.amount), 0);
  const expense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + decimalToNumber(t.amount), 0);
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

  const insights: Insight[] = [];

  if (savingsRate >= 20) {
    insights.push({
      id: "savings-great",
      type: "positive",
      title: "Excelente ritmo de ahorro",
      description: `Estás ahorrando ${savingsRate.toFixed(0)}% de tus ingresos este mes.`,
      action: { label: "Ver metas", href: "/dashboard/personal/goals" },
    });
  } else if (income > 0 && savingsRate < 5) {
    insights.push({
      id: "savings-low",
      type: "warning",
      title: "Tu tasa de ahorro es baja",
      description: `Solo estás ahorrando ${savingsRate.toFixed(0)}% este mes. Intenta reducir gastos discrecionales.`,
      action: { label: "Ver presupuestos", href: "/dashboard/personal/budgets" },
    });
  }

  const overspentBudget = budgets.find(
    (b) => decimalToNumber(b.spent) > decimalToNumber(b.amount)
  );
  if (overspentBudget) {
    insights.push({
      id: "budget-overflow",
      type: "warning",
      title: `Presupuesto excedido: ${overspentBudget.name}`,
      description: `Llevas ${formatCurrency(decimalToNumber(overspentBudget.spent), currency)} de ${formatCurrency(
        decimalToNumber(overspentBudget.amount),
        currency
      )}.`,
      action: { label: "Revisar", href: "/dashboard/personal/budgets" },
    });
  }

  const nearLimitBudget = budgets.find(
    (b) => {
      const pct = decimalToNumber(b.amount) > 0
        ? (decimalToNumber(b.spent) / decimalToNumber(b.amount)) * 100
        : 0;
      return pct >= 80 && pct < 100;
    }
  );
  if (nearLimitBudget) {
    insights.push({
      id: "budget-near",
      type: "tip",
      title: `Casi al límite: ${nearLimitBudget.name}`,
      description: `Has usado ${((decimalToNumber(nearLimitBudget.spent) / decimalToNumber(nearLimitBudget.amount)) * 100).toFixed(0)}% del presupuesto.`,
      action: { label: "Ver", href: "/dashboard/personal/budgets" },
    });
  }

  const upcomingDebt = debts
    .filter((d) => d.dueDate && new Date(d.dueDate) >= now && new Date(d.dueDate) <= weekFromNow)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0];
  if (upcomingDebt) {
    insights.push({
      id: "debt-upcoming",
      type: "warning",
      title: `Deuda próxima: ${upcomingDebt.name}`,
      description: `Vence en ${Math.ceil(
        (new Date(upcomingDebt.dueDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )} días por ${formatCurrency(decimalToNumber(upcomingDebt.remainingAmount), currency)}.`,
      action: { label: "Ver deudas", href: "/dashboard/personal/debts" },
    });
  }

  const nearGoal = goals.find((g) => {
    const pct = decimalToNumber(g.targetAmount) > 0
      ? (decimalToNumber(g.currentAmount) / decimalToNumber(g.targetAmount)) * 100
      : 0;
    return pct >= 75 && pct < 100;
  });
  if (nearGoal) {
    insights.push({
      id: "goal-near",
      type: "positive",
      title: `Meta casi lista: ${nearGoal.name}`,
      description: `Llevas ${((decimalToNumber(nearGoal.currentAmount) / decimalToNumber(nearGoal.targetAmount)) * 100).toFixed(0)}% del objetivo.`,
      action: { label: "Ver metas", href: "/dashboard/personal/goals" },
    });
  }

  const totalSubscriptions = subscriptions.reduce(
    (sum, s) => sum + decimalToNumber(s.amount),
    0
  );
  if (totalSubscriptions > 0 && income > 0 && totalSubscriptions / income > 0.15) {
    insights.push({
      id: "subscriptions-high",
      type: "tip",
      title: "Revisa tus suscripciones",
      description: `Gastas ${formatCurrency(totalSubscriptions, currency)} mensuales en suscripciones (${((totalSubscriptions / income) * 100).toFixed(0)}% de tus ingresos).`,
      action: { label: "Auditar", href: "/dashboard/personal/subscriptions" },
    });
  }

  const negativeInvestment = investments.find((i) => {
    const invested = decimalToNumber(i.investedAmount);
    return invested > 0 && decimalToNumber(i.balance) < invested * 0.9;
  });
  if (negativeInvestment) {
    insights.push({
      id: "investment-loss",
      type: "warning",
      title: `Inversión en caída: ${negativeInvestment.name}`,
      description: `Su valor actual es notablemente menor al monto invertido.`,
      action: { label: "Ver portafolio", href: "/dashboard/personal/investments" },
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "default-tip",
      type: "tip",
      title: "Consejo del día",
      description:
        "Registra tus transacciones diarias para descubrir gastos hormiga y tomar mejores decisiones.",
      action: { label: "Agregar movimiento", href: "/dashboard/transactions" },
    });
  }

  const displayed = insights.slice(0, 4);

  return (
    <Card className="surface-elevated-2 rounded-xl border-border">
      <CardHeader className="pb-3">
        <CardTitle className="heading-card flex items-center gap-2 text-base">
          <Lightbulb className="h-5 w-5 text-primary" />
          Insights inteligentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {displayed.map((insight) => (
            <li
              key={insight.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-card/50 p-4"
            >
              <div className="mt-0.5 shrink-0">
                {insight.type === "positive" && <TrendingUp className="h-5 w-5 text-emerald-500" />}
                {insight.type === "warning" && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                {insight.type === "tip" && <PiggyBank className="h-5 w-5 text-primary" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{insight.title}</p>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
                {insight.action && (
                  <Button variant="link" size="sm" className="h-auto p-0 text-primary" asChild>
                    <Link href={insight.action.href} className="inline-flex items-center gap-1">
                      {insight.action.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
