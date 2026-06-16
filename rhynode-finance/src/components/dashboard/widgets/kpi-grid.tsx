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

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

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

export function KpiGrid({
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
  const personalKpis: KpiItem[] = [
    { title: "Balance Total", value: formatCurrency(personalBalance, currency), icon: Wallet, color: "text-primary", empty: personalBalance === 0 },
    { title: "Ingresos", value: formatCurrency(personalIncome, currency), icon: TrendingUp, color: "text-emerald-400", empty: personalIncome === 0 },
    { title: "Gastos", value: formatCurrency(personalExpenses, currency), icon: TrendingDown, color: "text-red-400", empty: personalExpenses === 0 },
    { title: "Metas Activas", value: String(activeGoals), icon: Target, color: "text-primary", empty: activeGoals === 0 },
    { title: "Deudas", value: String(pendingDebts), icon: AlertTriangle, color: "text-amber-400", empty: pendingDebts === 0 },
    { title: "Transacciones", value: String(monthlyTransactions), icon: Activity, color: "text-primary", empty: monthlyTransactions === 0 },
    { title: "Disponible", value: formatCurrency(Math.max(0, personalIncome - personalExpenses), currency), icon: CreditCard, color: "text-emerald-400", empty: personalIncome === 0 && personalExpenses === 0 },
    { title: "Ahorro", value: formatCurrency(personalIncome - personalExpenses, currency), icon: PiggyBank, color: "text-primary", empty: personalIncome === 0 },
  ];

  const businessKpis: KpiItem[] = [
    { title: "Facturado", value: formatCurrency(totalInvoiced, currency), icon: FileText, color: "text-primary", empty: totalInvoiced === 0 },
    { title: "Cobrado", value: formatCurrency(totalPaid, currency), icon: TrendingUp, color: "text-emerald-400", empty: totalPaid === 0 },
    { title: "Pendiente", value: formatCurrency(totalPending, currency), icon: TrendingDown, color: "text-amber-400", empty: totalPending === 0 },
    { title: "Vencido", value: formatCurrency(totalOverdue, currency), icon: AlertTriangle, color: "text-red-400", empty: totalOverdue === 0 },
    { title: "Clientes", value: String(clientCount), icon: Users, color: "text-primary", empty: clientCount === 0 },
    { title: "Impuestos Pend.", value: String(taxPending), icon: ShieldCheck, color: "text-amber-400", empty: taxPending === 0 },
    { title: "Saldo Bancario", value: formatCurrency(bankBalance, currency), icon: Landmark, color: "text-primary", empty: bankBalance === 0 },
    { title: "Facturas", value: String(invoiceCount), icon: FileText, color: "text-primary", empty: invoiceCount === 0 },
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
                <p className="body-small mt-1 text-muted-foreground">Sin datos</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
