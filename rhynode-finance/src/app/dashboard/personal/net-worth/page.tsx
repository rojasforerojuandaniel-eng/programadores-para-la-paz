import { decimalToNumber } from "@/lib/decimal";
import { getPrisma } from "@/lib/prisma";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UpdateSnapshotButton } from "./update-button";
import { ServerDataTable } from "@/components/dashboard/server-data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { TableCell } from "@/components/ui/table";
import { Landmark, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import dynamic from "next/dynamic";
import { NetWorthChartSkeleton } from "@/components/dashboard/net-worth-chart";

const NetWorthChart = dynamic(
  () => import("@/components/dashboard/net-worth-chart").then((mod) => mod.NetWorthChart),
  { loading: NetWorthChartSkeleton }
);

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export default async function NetWorthPage() {
  const org = await requireAuth();
  if (!org) redirect("/sign-in");

  const profile = await getUserProfile();
  const userId = profile?.id;

  const prisma = getPrisma();
  const [snapshots, accounts, debts] = userId
    ? await Promise.all([
        prisma.netWorthSnapshot.findMany({
          where: { userId },
          orderBy: { date: "desc" },
        }),
        prisma.account.findMany({ where: { userId }, select: { balance: true } }),
        prisma.debt.findMany({
          where: { userId, status: "ACTIVE" },
          select: { remainingAmount: true },
        }),
      ])
    : [[], [], []];

  const totalAssets = accounts.reduce((s, a) => s + decimalToNumber(a.balance), 0);
  const totalLiabilities = debts.reduce((s, d) => s + decimalToNumber(d.remainingAmount), 0);

  const latest = snapshots[0];
  const previous = snapshots[1];

  const netWorthTrend =
    latest && previous ? decimalToNumber(latest.netWorth) - decimalToNumber(previous.netWorth) : 0;

  const chartSnapshots = [...snapshots].slice(0, 12).reverse();
  const chartData = chartSnapshots.map((s) => ({
    date: s.date.toISOString(),
    label: new Date(s.date).toLocaleDateString("es-CO", { month: "short", day: "numeric" }),
    netWorth: decimalToNumber(s.netWorth),
    assets: decimalToNumber(s.totalAssets),
    liabilities: decimalToNumber(s.totalLiabilities),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">Patrimonio Neto</h1>
          <p className="body-default mt-1">Seguimiento de tu patrimonio a lo largo del tiempo</p>
        </div>
        <UpdateSnapshotButton
          totalAssets={totalAssets}
          totalLiabilities={totalLiabilities}
          currency={org.currency}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Patrimonio Neto"
          value={latest ? formatCurrency(decimalToNumber(latest.netWorth), latest.currency) : "—"}
          icon={netWorthTrend >= 0 ? TrendingUp : TrendingDown}
          valueClassName={
            latest && previous
              ? netWorthTrend >= 0
                ? "text-emerald-500"
                : "text-rose-500"
              : undefined
          }
          footer={
            latest && previous ? (
              <Badge
                variant="outline"
                className={`text-xs ${netWorthTrend >= 0 ? "text-emerald-500 border-emerald-500/30" : "text-rose-500 border-rose-500/30"}`}
              >
                {netWorthTrend >= 0 ? "+" : ""}
                {formatCurrency(netWorthTrend, latest.currency)}
              </Badge>
            ) : undefined
          }
          className="sm:col-span-1"
        />
        <KpiCard
          label="Activos Totales"
          value={
            latest ? formatCurrency(decimalToNumber(latest.totalAssets), latest.currency) : "—"
          }
          icon={Landmark}
        />
        <KpiCard
          label="Deudas Totales"
          value={
            latest
              ? formatCurrency(decimalToNumber(latest.totalLiabilities), latest.currency)
              : "—"
          }
          icon={Wallet}
          valueClassName="text-rose-500"
        />
      </div>

      {chartData.length > 0 && (
        <Card className="surface-elevated-2 rounded-xl border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Evolución (últimos 12 registros)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NetWorthChart data={chartData} currency={latest?.currency ?? org.currency} />
          </CardContent>
        </Card>
      )}

      <ServerDataTable
        columns={[
          { key: "date", header: "Fecha" },
          { key: "assets", header: "Activos" },
          { key: "liabilities", header: "Deudas" },
          { key: "netWorth", header: "Patrimonio" },
        ]}
        data={snapshots}
        renderRow={(item) => (
          <>
            <TableCell className="py-3 text-sm">{formatDate(item.date)}</TableCell>
            <TableCell className="py-3 text-sm">
              {formatCurrency(decimalToNumber(item.totalAssets), item.currency)}
            </TableCell>
            <TableCell className="py-3 text-sm">
              {formatCurrency(decimalToNumber(item.totalLiabilities), item.currency)}
            </TableCell>
            <TableCell className="py-3 text-sm font-medium">
              {formatCurrency(decimalToNumber(item.netWorth), item.currency)}
            </TableCell>
          </>
        )}
        renderCard={(item) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{formatDate(item.date)}</span>
              <span className="text-sm font-bold">
                {formatCurrency(decimalToNumber(item.netWorth), item.currency)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-muted-foreground">Activos</div>
              <div className="text-right font-medium">
                {formatCurrency(decimalToNumber(item.totalAssets), item.currency)}
              </div>
              <div className="text-muted-foreground">Deudas</div>
              <div className="text-right font-medium">
                {formatCurrency(decimalToNumber(item.totalLiabilities), item.currency)}
              </div>
            </div>
          </div>
        )}
        emptyState={
          <EmptyStateCard
            icon={Landmark}
            title="No tienes snapshots"
            description="Crea tu primer registro de patrimonio para empezar a hacer seguimiento."
            action={
              <UpdateSnapshotButton
                totalAssets={totalAssets}
                totalLiabilities={totalLiabilities}
                currency={org.currency}
              />
            }
          />
        }
      />
    </div>
  );
}
