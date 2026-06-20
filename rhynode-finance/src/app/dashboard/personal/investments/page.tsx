import { getPrisma } from "@/lib/prisma";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale, type Locale } from "@/lib/locale-server";
import { formatCurrency as fmtCur, formatDate as fmtDate, formatNumber as fmtNum } from "@/lib/format";
import { dashboardMetadata } from "@/lib/dashboard-metadata";
import { Badge } from "@/components/ui/badge";
import { ServerDataTable } from "@/components/dashboard/server-data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { TableCell } from "@/components/ui/table";
import { CreateInvestmentDialog } from "./create-dialog";
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  Wallet,
  Bitcoin,
  Layers,
  Home,
  Shield,
  Clock,
} from "lucide-react";
import dynamic from "next/dynamic";
import { InvestmentAllocationChartSkeleton } from "@/components/dashboard/investment-allocation-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveInvestmentPrices, ResolvedInvestment } from "@/lib/market-prices";
import { cn } from "@/lib/utils";

const InvestmentAllocationChart = dynamic(
  () =>
    import("@/components/dashboard/investment-allocation-chart").then(
      (mod) => mod.InvestmentAllocationChart
    ),
  { loading: InvestmentAllocationChartSkeleton }
);

export const metadata = dashboardMetadata(
  "Inversiones",
  "Registra y haz seguimiento de tus inversiones: acciones, bonos, cripto, ETFs y bienes raíces."
);

const intlLocale = (locale: Locale): string => (locale === "en" ? "en-US" : "es-CO");

function formatCurrency(amount: number, currency: string, locale: Locale) {
  const fractionDigits = currency.toUpperCase() === "COP" ? 0 : 2;
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

function formatPrice(amount: number, currency: string, locale: Locale) {
  const fractionDigits = currency.toUpperCase() === "COP" ? 0 : 4;
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

function formatPercent(value: number, locale: Locale) {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

function formatDateTime(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

const investmentTypeColors: Record<string, string> = {
  STOCK: "bg-info/15 text-info border-info/20",
  BOND: "bg-success/15 text-success border-success/20",
  CRYPTO: "bg-purple-500/15 text-purple-500 border-purple-500/20",
  ETF: "bg-warning/15 text-warning border-warning/20",
  REAL_ESTATE: "bg-danger/15 text-danger border-danger/20",
  OTHER: "bg-muted text-muted-foreground border-border",
};

const investmentTypeIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  STOCK: TrendingUp,
  BOND: Shield,
  CRYPTO: Bitcoin,
  ETF: Layers,
  REAL_ESTATE: Home,
  OTHER: Briefcase,
};

function sourceBadge(source: ResolvedInvestment["marketPrice"]["source"]) {
  switch (source) {
    case "real":
      return {
        labelKey: "real" as const,
        className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
      };
    case "estimated":
      return {
        labelKey: "estimated" as const,
        className: "bg-amber-500/15 text-amber-600 border-amber-500/20",
      };
    default:
      return { labelKey: "na" as const, className: "bg-muted text-muted-foreground border-border" };
  }
}

function MiniSparkline({ positive }: { positive: boolean }) {
  const path = positive
    ? "M2 14 L6 10 L10 11 L14 6 L18 8 L22 2"
    : "M2 4 L6 6 L10 5 L14 10 L18 8 L22 14";
  return (
    <svg
      viewBox="0 0 24 16"
      className="h-8 w-16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d={path}
        className={cn(positive ? "text-success" : "text-danger", "opacity-80")}
      />
    </svg>
  );
}

export default async function InvestmentsPage() {
  const org = await requireAuth();
  if (!org) redirect("/sign-in");

  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.investments" });

  const profile = await getUserProfile();
  const userId = profile?.id;

  const prisma = getPrisma();
  const investments = userId
    ? await prisma.investment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const resolvedInvestments = await resolveInvestmentPrices(investments);

  const totalInvested = resolvedInvestments.reduce((s, i) => s + i.investedAmount, 0);
  const totalCurrent = resolvedInvestments.reduce((s, i) => s + i.estimatedValue, 0);
  const totalReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

  const allocation = Object.entries(
    resolvedInvestments.reduce((acc, inv) => {
      const amount = inv.estimatedValue;
      acc[inv.investmentType] = (acc[inv.investmentType] ?? 0) + amount;
      return acc;
    }, {} as Record<string, number>)
  )
    .map(([type, amount]) => ({
      type,
      label: t(`types.${type}` as never),
      value: totalCurrent > 0 ? (amount / totalCurrent) * 100 : 0,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">{t("subtitle")}</p>
        </div>
        <CreateInvestmentDialog />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label={t("kpis.totalInvested")} value={formatCurrency(totalInvested, org.currency, locale)} icon={Wallet} />
        <KpiCard label={t("kpis.currentValue")} value={formatCurrency(totalCurrent, org.currency, locale)} icon={Briefcase} />
        <KpiCard
          label={t("kpis.totalReturn")}
          value={formatPercent(totalReturn, locale)}
          icon={totalReturn >= 0 ? TrendingUp : TrendingDown}
          valueClassName={totalReturn >= 0 ? "text-success" : "text-danger"}
        />
      </div>

      {allocation.length > 0 && (
        <Card className="surface-elevated-2 rounded-xl border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("allocation")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InvestmentAllocationChart data={allocation} currency={org.currency} />
          </CardContent>
        </Card>
      )}

      <ServerDataTable
        columns={[
          { key: "name", header: t("columns.name") },
          { key: "type", header: t("columns.type") },
          { key: "price", header: t("columns.price") },
          { key: "value", header: t("columns.value") },
          { key: "invested", header: t("columns.invested") },
          { key: "gain", header: t("columns.gain") },
          { key: "return", header: t("columns.return") },
          { key: "source", header: t("columns.source") },
        ]}
        data={resolvedInvestments}
        renderRow={(item) => {
          const { marketPrice, gainAmount, gainPercent } = item;
          const source = sourceBadge(marketPrice.source);
          const TypeIcon = investmentTypeIcons[item.investmentType] || Briefcase;
          return (
            <>
              <TableCell className="py-3">
                <div className="flex items-center gap-2">
                  <TypeIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
              </TableCell>
              <TableCell className="py-3">
                <Badge
                  variant="outline"
                  className={investmentTypeColors[item.investmentType] || "bg-slate-500/15 text-slate-600 border-slate-500/20"}
                >
                  {t(`types.${item.investmentType}` as never)}
                </Badge>
              </TableCell>
              <TableCell className="py-3 text-sm">
                {marketPrice.price !== null ? (
                  <div className="space-y-0.5">
                    <div>{formatPrice(marketPrice.price, marketPrice.currency, locale)}</div>
                    {item.estimatedQuantity !== null && (
                      <div className="text-xs text-muted-foreground">
                        ~{fmtNum(item.estimatedQuantity, locale)} {t("units")}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="py-3 text-sm font-medium">
                {formatCurrency(item.estimatedValue, item.currency, locale)}
              </TableCell>
              <TableCell className="py-3 text-sm text-muted-foreground">
                {formatCurrency(item.investedAmount, item.currency, locale)}
              </TableCell>
              <TableCell className={`py-3 text-sm font-medium ${gainAmount >= 0 ? "text-success" : "text-danger"}`}>
                {formatCurrency(gainAmount, item.currency, locale)}
              </TableCell>
              <TableCell className={`py-3 text-sm font-medium ${gainPercent >= 0 ? "text-success" : "text-danger"}`}>
                {formatPercent(gainPercent, locale)}
              </TableCell>
              <TableCell className="py-3">
                <Badge variant="outline" className={source.className} title={marketPrice.note}>
                  {t(`sources.${source.labelKey}` as never)}
                </Badge>
              </TableCell>
            </>
          );
        }}
        renderCard={(item) => {
          const { marketPrice, gainAmount, gainPercent } = item;
          const source = sourceBadge(marketPrice.source);
          const positive = gainPercent >= 0;
          const TypeIcon = investmentTypeIcons[item.investmentType] || Briefcase;
          return (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <TypeIcon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight">{item.name}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-1",
                        investmentTypeColors[item.investmentType] || "bg-slate-500/15 text-slate-600 border-slate-500/20"
                      )}
                    >
                      {t(`types.${item.investmentType}` as never)}
                    </Badge>
                  </div>
                </div>
                <Badge variant="outline" className={source.className} title={marketPrice.note}>
                  {t(`sources.${source.labelKey}` as never)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="text-muted-foreground">{t("card.currentValue")}</div>
                <div className="text-right font-semibold">
                  {formatCurrency(item.estimatedValue, item.currency, locale)}
                </div>

                <div className="text-muted-foreground">{t("card.invested")}</div>
                <div className="text-right">{formatCurrency(item.investedAmount, item.currency, locale)}</div>

                <div className="text-muted-foreground">{t("card.gainLoss")}</div>
                <div className={`text-right font-semibold ${gainAmount >= 0 ? "text-success" : "text-danger"}`}>
                  {formatCurrency(gainAmount, item.currency, locale)}
                </div>

                <div className="text-muted-foreground">{t("card.returnLabel")}</div>
                <div className={`text-right font-semibold ${positive ? "text-success" : "text-danger"}`}>
                  {formatPercent(gainPercent, locale)}
                </div>

                <div className="text-muted-foreground">{t("card.marketPrice")}</div>
                <div className="text-right">
                  {marketPrice.price !== null ? (
                    formatPrice(marketPrice.price, marketPrice.currency, locale)
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>

                <div className="text-muted-foreground">{t("card.updated")}</div>
                <div className="text-right text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(marketPrice.updatedAt, locale)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <MiniSparkline positive={positive} />
                <div className="text-right">
                  <p className={`text-sm font-semibold ${positive ? "text-success" : "text-danger"}`}>
                    {positive ? "+" : ""}
                    {formatPercent(gainPercent, locale)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.estimatedQuantity !== null
                      ? `~${fmtNum(item.estimatedQuantity, locale)} ${t("unitsShort")}`
                      : marketPrice.note || t("noQuote")}
                  </p>
                </div>
              </div>
            </div>
          );
        }}
        emptyState={
          <EmptyStateCard
            variant="md"
            icon={TrendingUp}
            title={t("empty.title")}
            description={t("empty.description")}
            hint={t("empty.hint")}
            action={<CreateInvestmentDialog />}
          />
        }
      />
    </div>
  );
}