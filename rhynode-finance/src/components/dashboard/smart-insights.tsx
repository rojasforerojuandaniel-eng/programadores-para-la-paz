import { getPrisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { decimalToNumber } from "@/lib/decimal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale, type Locale } from "@/lib/locale-server";
import { formatCurrency } from "@/lib/format";
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

export async function SmartInsights({ currency }: { currency: string }) {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.ai" });

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
    .filter((tx) => tx.type === "INCOME")
    .reduce((sum, tx) => sum + decimalToNumber(tx.amount), 0);
  const expense = transactions
    .filter((tx) => tx.type === "EXPENSE")
    .reduce((sum, tx) => sum + decimalToNumber(tx.amount), 0);
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

  const insights: Insight[] = [];

  const buildAction = (key: string, href: string) => ({
    label: t(key),
    href,
  });

  if (savingsRate >= 20) {
    insights.push({
      id: "savings-great",
      type: "positive",
      title: t("insights.savings-great.title"),
      description: t("insights.savings-great.description", { pct: savingsRate.toFixed(0) }),
      action: buildAction("insights.savings-great.action", "/dashboard/personal/goals"),
    });
  } else if (income > 0 && savingsRate < 5) {
    insights.push({
      id: "savings-low",
      type: "warning",
      title: t("insights.savings-low.title"),
      description: t("insights.savings-low.description", { pct: savingsRate.toFixed(0) }),
      action: buildAction("insights.savings-low.action", "/dashboard/personal/budgets"),
    });
  }

  const overspentBudget = budgets.find(
    (b) => decimalToNumber(b.spent) > decimalToNumber(b.amount)
  );
  if (overspentBudget) {
    insights.push({
      id: "budget-overflow",
      type: "warning",
      title: t("insights.budget-overflow.title", { name: overspentBudget.name }),
      description: t("insights.budget-overflow.description", {
        spent: formatCurrency(decimalToNumber(overspentBudget.spent), currency, locale),
        amount: formatCurrency(decimalToNumber(overspentBudget.amount), currency, locale),
      }),
      action: buildAction("insights.budget-overflow.action", "/dashboard/personal/budgets"),
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
    const usedPct = (
      (decimalToNumber(nearLimitBudget.spent) / decimalToNumber(nearLimitBudget.amount)) * 100
    ).toFixed(0);
    insights.push({
      id: "budget-near",
      type: "tip",
      title: t("insights.budget-near.title", { name: nearLimitBudget.name }),
      description: t("insights.budget-near.description", { pct: usedPct }),
      action: buildAction("insights.budget-near.action", "/dashboard/personal/budgets"),
    });
  }

  const upcomingDebt = debts
    .filter((d) => d.dueDate && new Date(d.dueDate) >= now && new Date(d.dueDate) <= weekFromNow)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0];
  if (upcomingDebt) {
    const days = Math.ceil(
      (new Date(upcomingDebt.dueDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    insights.push({
      id: "debt-upcoming",
      type: "warning",
      title: t("insights.debt-upcoming.title", { name: upcomingDebt.name }),
      description: t("insights.debt-upcoming.description", {
        days,
        amount: formatCurrency(decimalToNumber(upcomingDebt.remainingAmount), currency, locale),
      }),
      action: buildAction("insights.debt-upcoming.action", "/dashboard/personal/debts"),
    });
  }

  const nearGoal = goals.find((g) => {
    const pct = decimalToNumber(g.targetAmount) > 0
      ? (decimalToNumber(g.currentAmount) / decimalToNumber(g.targetAmount)) * 100
      : 0;
    return pct >= 75 && pct < 100;
  });
  if (nearGoal) {
    const pct = (
      (decimalToNumber(nearGoal.currentAmount) / decimalToNumber(nearGoal.targetAmount)) * 100
    ).toFixed(0);
    insights.push({
      id: "goal-near",
      type: "positive",
      title: t("insights.goal-near.title", { name: nearGoal.name }),
      description: t("insights.goal-near.description", { pct }),
      action: buildAction("insights.goal-near.action", "/dashboard/personal/goals"),
    });
  }

  const totalSubscriptions = subscriptions.reduce(
    (sum, s) => sum + decimalToNumber(s.amount),
    0
  );
  if (totalSubscriptions > 0 && income > 0 && totalSubscriptions / income > 0.15) {
    const pctSubs = ((totalSubscriptions / income) * 100).toFixed(0);
    insights.push({
      id: "subscriptions-high",
      type: "tip",
      title: t("insights.subscriptions-high.title"),
      description: t("insights.subscriptions-high.description", {
        amount: formatCurrency(totalSubscriptions, currency, locale),
        pct: pctSubs,
      }),
      action: buildAction("insights.subscriptions-high.action", "/dashboard/personal/subscriptions"),
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
      title: t("insights.investment-loss.title", { name: negativeInvestment.name }),
      description: t("insights.investment-loss.description"),
      action: buildAction("insights.investment-loss.action", "/dashboard/personal/investments"),
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "default-tip",
      type: "tip",
      title: t("insights.default-tip.title"),
      description: t("insights.default-tip.description"),
      action: buildAction("insights.default-tip.action", "/dashboard/transactions"),
    });
  }

  const displayed = insights.slice(0, 4);

  return (
    <Card className="surface-elevated-2 rounded-xl border-border">
      <CardHeader className="pb-3">
        <CardTitle className="heading-card flex items-center gap-2 text-base">
          <Lightbulb className="h-5 w-5 text-primary" />
          {t("insights.title")}
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