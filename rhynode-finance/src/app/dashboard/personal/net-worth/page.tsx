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
import { Landmark, TrendingUp, TrendingDown, Wallet, Scale } from "lucide-react";
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

function formatRatio(ratio: number) {
  return `${(ratio * 100).toFixed(1)}%`;
}

function ratioStatus(ratio: number) {
  if (ratio < 0.3) return { label: "Saludable", tone: "emerald" as const };
  if (ratio < 0.6) return { label: "Moderado", tone: "amber" as const };
  return { label: "Alto riesgo", tone: "rose" as const };
}

const toneClasses = {
  emerald: "text-emerald-700 border-emerald-500/30 bg-emerald-500/10",
  amber: "text-amber-700 border-amber-500/30 bg-amber-500/10",
  rose: "text-rose-700 border-rose-500/30 bg-rose-500/10",
};

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

  const debtToAssetRatio = totalAssets > 0 ? totalLiabilities / totalAssets : null;
  const ratioInfo = debtToAssetRatio !== null ? ratioStatus(debtToAssetRatio) : null;

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Patrimonio Neto"
          value={latest ? formatCurrency(decimalToNumber(latest.netWorth), latest.currency) : "—"}
          icon={netWorthTrend >= 0 ? TrendingUp : TrendingDown}
          valueClassName={
            latest && previous
              ? netWorthTrend >= 0
                ? "text-emerald-600"
                : "text-rose-600"
              : undefined
          }
          footer={
            latest && previous ? (
              <Badge
                variant="outline"
                className={`text-xs ${netWorthTrend >= 0 ? "text-emerald-700 border-emerald-500/30" : "text-rose-700 border-rose-500/30"}`}
              >
                {netWorthTrend >= 0 ? "+" : ""}
                {formatCurrency(netWorthTrend, latest.currency)}
              </Badge>
            ) : undefined
          }
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
          valueClassName="text-rose-600"
        />
        <KpiCard
          label="Ratio Deuda/Activo"
          value={debtToAssetRatio !== null ? formatRatio(debtToAssetRatio) : "—"}
          icon={Scale}
          valueClassName={
            ratioInfo?.tone === "emerald"
              ? "text-emerald-700"
              : ratioInfo?.tone === "amber"
                ? "text-amber-700"
                : ratioInfo?.tone === "rose"
                  ? "text-rose-700"
                  : undefined
          }
          footer={
            ratioInfo ? (
              <Badge variant="outline" className={`text-xs ${toneClasses[ratioInfo.tone]}`}>
                {ratioInfo.label}
              </Badge>
            ) : undefined
          }
        />
      </div>

      {chartData.length > 0 && (
        <Card className="surface-elevated-2 rounded-xl border-border">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle id="net-worth-chart-title" className="text-sm font-medium text-muted-foreground">
                Evolución del patrimonio
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                Últimos {chartData.length} registros
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <figure aria-labelledby="net-worth-chart-title">
              <NetWorthChart data={chartData} currency={latest?.currency ?? org.currency} />
              <figcaption className="sr-only">
                Gráfico de evolución del patrimonio mostrando activos, deudas y patrimonio neto de los últimos {chartData.length} registros.
              </figcaption>
            </figure>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
                <span>Patrimonio neto</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-chart-2" aria-hidden="true" />
                <span>Activos</span>
              </div>
            </div>
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
            <TableCell className="py-3 text-sm whitespace-nowrap">{formatDate(item.date)}</TableCell>
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
        renderCard={(item) => {
          const assets = decimalToNumber(item.totalAssets);
          const liabilities = decimalToNumber(item.totalLiabilities);
          const netWorth = decimalToNumber(item.netWorth);
          const itemRatio = assets > 0 ? liabilities / assets : null;
          const itemStatus = itemRatio !== null ? ratioStatus(itemRatio) : null;

          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{formatDate(item.date)}</span>
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(netWorth, item.currency)}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Activos</dt>
                <dd className="text-right font-medium">
                  {formatCurrency(assets, item.currency)}
                </dd>
                <dt className="text-muted-foreground">Deudas</dt>
                <dd className="text-right font-medium text-rose-600">
                  {formatCurrency(liabilities, item.currency)}
                </dd>
              </dl>
              {itemStatus && (
                <Badge variant="outline" className={`text-xs ${toneClasses[itemStatus.tone]}`}>
                  Ratio {formatRatio(itemRatio!)} · {itemStatus.label}
                </Badge>
              )}
            </div>
          );
        }}
        emptyState={
          <EmptyStateCard
            variant="lg"
            icon={Landmark}
            title="Tu patrimonio empieza aquí"
            description="Guarda snapshots periódicos para ver cómo evolucionan tus activos y deudas."
            hint="Empieza creando tu primer registro de patrimonio."
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
