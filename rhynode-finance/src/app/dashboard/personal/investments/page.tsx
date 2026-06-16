import { decimalToNumber } from "@/lib/decimal";
import { getPrisma } from "@/lib/prisma";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { dashboardMetadata } from "@/lib/dashboard-metadata";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/dashboard/data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { TableCell } from "@/components/ui/table";
import { CreateInvestmentDialog } from "./create-dialog";
import { TrendingUp, TrendingDown, Minus, Briefcase } from "lucide-react";

export const metadata = dashboardMetadata(
  "Inversiones",
  "Registra y haz seguimiento de tus inversiones: acciones, bonos, cripto, ETFs y bienes raíces."
);

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

const investmentTypeLabels: Record<string, string> = {
  STOCK: "Acciones",
  BOND: "Bonos",
  CRYPTO: "Cripto",
  ETF: "ETF",
  REAL_ESTATE: "Bienes Raíces",
  OTHER: "Otro",
};

const investmentTypeColors: Record<string, string> = {
  STOCK: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  BOND: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  CRYPTO: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  ETF: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  REAL_ESTATE: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  OTHER: "bg-slate-500/15 text-slate-400 border-slate-500/20",
};

export default async function InvestmentsPage() {
  const org = await requireAuth();
  if (!org) redirect("/sign-in");

  const profile = await getUserProfile();
  const userId = profile?.id;

  const prisma = getPrisma();
  const investments = userId
    ? await prisma.investment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const totalInvested = investments.reduce((s, i) => s + decimalToNumber(i.investedAmount), 0);
  const totalCurrent = investments.reduce((s, i) => s + decimalToNumber(i.balance), 0);
  const totalReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">Inversiones</h1>
          <p className="body-default mt-1">Portafolio de inversiones</p>
        </div>
        <CreateInvestmentDialog />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Invertido" value={formatCurrency(totalInvested, org.currency)} icon={Minus} />
        <KpiCard label="Valor Actual" value={formatCurrency(totalCurrent, org.currency)} icon={Briefcase} />
        <KpiCard
          label="Retorno Total"
          value={formatPercent(totalReturn)}
          icon={totalReturn >= 0 ? TrendingUp : TrendingDown}
          valueClassName={totalReturn >= 0 ? "text-emerald-500" : "text-rose-500"}
        />
      </div>

      <DataTable
        columns={[
          { key: "name", header: "Nombre" },
          { key: "type", header: "Tipo" },
          { key: "current", header: "Valor Actual" },
          { key: "invested", header: "Invertido" },
          { key: "return", header: "Retorno %" },
        ]}
        data={investments}
        renderRow={(item) => {
          const balance = decimalToNumber(item.balance);
          const investedAmount = decimalToNumber(item.investedAmount);
          const ret = investedAmount > 0 ? ((balance - investedAmount) / investedAmount) * 100 : 0;
          return (
            <>
              <TableCell className="py-3 text-sm font-medium">{item.name}</TableCell>
              <TableCell className="py-3">
                <Badge
                  variant="outline"
                  className={investmentTypeColors[item.investmentType] || "bg-slate-500/15 text-slate-400 border-slate-500/20"}
                >
                  {investmentTypeLabels[item.investmentType] || item.investmentType}
                </Badge>
              </TableCell>
              <TableCell className="py-3 text-sm">{formatCurrency(balance, item.currency)}</TableCell>
              <TableCell className="py-3 text-sm">{formatCurrency(investedAmount, item.currency)}</TableCell>
              <TableCell className={`py-3 text-sm font-medium ${ret >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {formatPercent(ret)}
              </TableCell>
            </>
          );
        }}
        renderCard={(item) => {
          const balance = decimalToNumber(item.balance);
          const investedAmount = decimalToNumber(item.investedAmount);
          const ret = investedAmount > 0 ? ((balance - investedAmount) / investedAmount) * 100 : 0;
          return (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium">{item.name}</span>
                <Badge
                  variant="outline"
                  className={investmentTypeColors[item.investmentType] || "bg-slate-500/15 text-slate-400 border-slate-500/20"}
                >
                  {investmentTypeLabels[item.investmentType] || item.investmentType}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-muted-foreground">Valor Actual</div>
                <div className="text-right font-medium">{formatCurrency(balance, item.currency)}</div>
                <div className="text-muted-foreground">Invertido</div>
                <div className="text-right font-medium">{formatCurrency(investedAmount, item.currency)}</div>
                <div className="text-muted-foreground">Retorno</div>
                <div className={`text-right font-medium ${ret >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {formatPercent(ret)}
                </div>
              </div>
            </div>
          );
        }}
        emptyState={
          <EmptyStateCard
            icon={TrendingUp}
            title="No tienes inversiones"
            description="Crea tu primera inversión para empezar a hacer seguimiento."
            action={<CreateInvestmentDialog />}
          />
        }
      />
    </div>
  );
}
