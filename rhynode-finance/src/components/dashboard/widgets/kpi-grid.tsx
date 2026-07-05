import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale } from "@/lib/locale-server";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Target,
  AlertTriangle,
  CreditCard,
  Activity,
  FileText,
  Users,
  ShieldCheck,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import type { UserScope } from "@/lib/scope";

interface KpiItem {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  empty: boolean;
}

interface KpiGridProps {
  scope: UserScope;
  currency: string;
  // Personal data
  personalBalance?: number;
  personalIncome?: number;
  personalExpenses?: number;
  activeGoals?: number;
  pendingDebts?: number;
  monthlyTransactions?: number;
  // Business data
  totalInvoiced?: number;
  totalPaid?: number;
  totalPending?: number;
  totalOverdue?: number;
  clientCount?: number;
  taxPending?: number;
  bankBalance?: number;
  invoiceCount?: number;
}

export async function KpiGrid({
  scope,
  currency,
  personalBalance = 0,
  personalIncome = 0,
  personalExpenses = 0,
  activeGoals = 0,
  pendingDebts = 0,
  monthlyTransactions = 0,
  totalInvoiced = 0,
  totalPaid = 0,
  totalPending = 0,
  totalOverdue = 0,
  clientCount = 0,
  taxPending = 0,
  bankBalance = 0,
  invoiceCount = 0,
}: KpiGridProps) {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.home" });

  const personalKpis: KpiItem[] = [
    { title: t("widgetsKpi.balanceTotal"), value: formatCurrency(personalBalance, currency, locale), icon: Wallet, color: "text-primary", empty: personalBalance === 0 },
    { title: t("widgetsKpi.income"), value: formatCurrency(personalIncome, currency, locale), icon: TrendingUp, color: "text-emerald-400", empty: personalIncome === 0 },
    { title: t("widgetsKpi.expenses"), value: formatCurrency(personalExpenses, currency, locale), icon: TrendingDown, color: "text-red-400", empty: personalExpenses === 0 },
    { title: t("widgetsKpi.activeGoals"), value: String(activeGoals), icon: Target, color: "text-primary", empty: activeGoals === 0 },
    { title: t("widgetsKpi.debts"), value: String(pendingDebts), icon: AlertTriangle, color: "text-amber-400", empty: pendingDebts === 0 },
    { title: t("widgetsKpi.transactions"), value: String(monthlyTransactions), icon: Activity, color: "text-primary", empty: monthlyTransactions === 0 },
    { title: t("widgetsKpi.available"), value: formatCurrency(Math.max(0, personalIncome - personalExpenses), currency, locale), icon: CreditCard, color: "text-emerald-400", empty: personalIncome === 0 && personalExpenses === 0 },
    { title: t("widgetsKpi.savings"), value: formatCurrency(personalIncome - personalExpenses, currency, locale), icon: PiggyBank, color: "text-primary", empty: personalIncome === 0 },
  ];

  const businessKpis: KpiItem[] = [
    { title: t("widgetsKpi.invoiced"), value: formatCurrency(totalInvoiced, currency, locale), icon: FileText, color: "text-primary", empty: totalInvoiced === 0 },
    { title: t("widgetsKpi.collected"), value: formatCurrency(totalPaid, currency, locale), icon: TrendingUp, color: "text-emerald-400", empty: totalPaid === 0 },
    { title: t("widgetsKpi.pending"), value: formatCurrency(totalPending, currency, locale), icon: TrendingDown, color: "text-amber-400", empty: totalPending === 0 },
    { title: t("widgetsKpi.overdue"), value: formatCurrency(totalOverdue, currency, locale), icon: AlertTriangle, color: "text-red-400", empty: totalOverdue === 0 },
    { title: t("widgetsKpi.clients"), value: String(clientCount), icon: Users, color: "text-primary", empty: clientCount === 0 },
    { title: t("widgetsKpi.taxesPending"), value: String(taxPending), icon: ShieldCheck, color: "text-amber-400", empty: taxPending === 0 },
    { title: t("widgetsKpi.bankBalance"), value: formatCurrency(bankBalance, currency, locale), icon: Landmark, color: "text-primary", empty: bankBalance === 0 },
    { title: t("widgetsKpi.invoices"), value: String(invoiceCount), icon: FileText, color: "text-primary", empty: invoiceCount === 0 },
  ];

  const bothKpis: KpiItem[] = [
    personalKpis[0], // Balance
    personalKpis[1], // Ingresos
    personalKpis[2], // Gastos
    businessKpis[0], // Facturado
    businessKpis[1], // Cobrado
    businessKpis[4], // Clientes
    personalKpis[3], // Metas
    personalKpis[5], // Transacciones
  ];

  let kpis: KpiItem[] = [];
  if (scope === "PERSONAL") kpis = personalKpis;
  else if (scope === "BUSINESS") kpis = businessKpis;
  else kpis = bothKpis;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.title} className={`surface-elevated-2 ${kpi.empty ? "opacity-70" : ""}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                {kpi.title}
                <Icon className={`h-4 w-4 ${kpi.color}`} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{kpi.value}</div>
              {kpi.empty && (
                <p className="body-small mt-1 text-muted-foreground">{t("widgetsKpi.noData")}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}