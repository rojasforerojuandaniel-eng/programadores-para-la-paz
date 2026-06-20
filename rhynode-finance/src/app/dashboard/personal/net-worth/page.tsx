import { decimalToNumber } from "@/lib/decimal";
import { getPrisma } from "@/lib/prisma";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale, type Locale } from "@/lib/locale-server";
import { formatCurrency, formatDate as fmtDate } from "@/lib/format";
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

function formatRatio(ratio: number) {
  return `${(ratio * 100).toFixed(1)}%`;
}

type RatioTone = "emerald" | "amber" | "rose";

function ratioStatus(ratio: number): { labelKey: "healthy" | "moderate" | "highRisk"; tone: RatioTone } {
  if (ratio < 0.3) return { labelKey: "healthy", tone: "emerald" };
  if (ratio < 0.6) return { labelKey: "moderate", tone: "amber" };
  return { labelKey: "highRisk", tone: "rose" };
}

const toneClasses: Record<RatioTone, string> = {
  emerald: "text-emerald-700 border-emerald-500/30 bg-emerald-500/10",
  amber: "text-amber-700 border-amber-500/30 bg-amber-500/10",
  rose: "text-rose-700 border-rose-500/30 bg-rose-500/10",
};

export default async function NetWorthPage() {
  const org = await requireAuth();
  if (!org) redirect("/sign-in");

  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.netWorth" });

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
    label: fmtDate(s.date, locale, { month: "short", day: "numeric" }),
    netWorth: decimalToNumber(s.netWorth),
    assets: decimalToNumber(s.totalAssets),
    liabilities: decimalToNumber(s.totalLiabilities),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">{t("subtitle")}</p>
        </div>
        <UpdateSnapshotButton
          totalAssets={totalAssets}
          totalLiabilities={totalLiabilities}
          currency={org.currency}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("kpis.netWorth")}
          value={latest ? formatCurrency(decimalToNumber(latest.netWorth), latest.currency, locale) : "—"}
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
                {formatCurrency(netWorthTrend, latest.currency, locale)}
              </Badge>
            ) : undefined
          }
        />
        <KpiCard
          label={t("kpis.assets")}
          value={latest ? formatCurrency(decimalToNumber(latest.totalAssets), latest.currency, locale) : "—"}
          icon={Landmark}
        />
        <KpiCard
          label={t("kpis.liabilities")}
          value={latest ? formatCurrency(decimalToNumber(latest.totalLiabilities), latest.currency, locale) : "—"}
          icon={Wallet}
          valueClassName="text-rose-600"
        />
        <KpiCard
          label={t("kpis.ratio")}
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
                {t(`ratioStatus.${ratioInfo.labelKey}` as never)}
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
                {t("chart.evolution")}
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {t("chart.lastN", { count: chartData.length })}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <figure aria-labelledby="net-worth-chart-title">
              <NetWorthChart data={chartData} currency={latest?.currency ?? org.currency} />
              <figcaption className="sr-only">
                {t("chart.srCaption", { count: chartData.length })}
              </figcaption>
            </figure>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
                <span>{t("chart.netWorth")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-chart-2" aria-hidden="true" />
                <span>{t("chart.assets")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ServerDataTable
        columns={[
          { key: "date", header: t("columns.date") },
          { key: "assets", header: t("columns.assets") },
          { key: "liabilities", header: t("columns.liabilities") },
          { key: "netWorth", header: t("columns.netWorth") },
        ]}
        data={snapshots}
        renderRow={(item) => (
          <>
            <TableCell className="py-3 text-sm whitespace-nowrap">{fmtDate(item.date, locale)}</TableCell>
            <TableCell className="py-3 text-sm">
              {formatCurrency(decimalToNumber(item.totalAssets), item.currency, locale)}
            </TableCell>
            <TableCell className="py-3 text-sm">
              {formatCurrency(decimalToNumber(item.totalLiabilities), item.currency, locale)}
            </TableCell>
            <TableCell className="py-3 text-sm font-medium">
              {formatCurrency(decimalToNumber(item.netWorth), item.currency, locale)}
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
                <span className="text-sm text-muted-foreground">{fmtDate(item.date, locale)}</span>
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(netWorth, item.currency, locale)}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <dt className="text-muted-foreground">{t("card.assets")}</dt>
                <dd className="text-right font-medium">
                  {formatCurrency(assets, item.currency, locale)}
                </dd>
                <dt className="text-muted-foreground">{t("card.liabilities")}</dt>
                <dd className="text-right font-medium text-rose-600">
                  {formatCurrency(liabilities, item.currency, locale)}
                </dd>
              </dl>
              {itemStatus && (
                <Badge variant="outline" className={`text-xs ${toneClasses[itemStatus.tone]}`}>
                  {t("card.ratioLabel", { ratio: formatRatio(itemRatio!), label: t(`ratioStatus.${itemStatus.labelKey}` as never) })}
                </Badge>
              )}
            </div>
          );
        }}
        emptyState={
          <EmptyStateCard
            variant="lg"
            icon={Landmark}
            title={t("empty.title")}
            description={t("empty.description")}
            hint={t("empty.hint")}
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
