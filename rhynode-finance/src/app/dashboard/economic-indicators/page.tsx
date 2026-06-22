import { fetchEconomicIndicators } from "@/lib/economic-indicators";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { dashboardMetadataLocale } from "@/lib/dashboard-metadata";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendBadge } from "./trend-badge";
import { Globe, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revalidatePath } from "next/cache";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale, type Locale } from "@/lib/locale-server";
import { formatDate as fmtDate } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "dashboard.economicIndicators" });
  return dashboardMetadataLocale(locale, t("title"), t("subtitle"));
}

function formatLastUpdated(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return fmtDate(date, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function refreshIndicators() {
  "use server";
  revalidatePath("/dashboard/economic-indicators");
}

export default async function EconomicIndicatorsPage() {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.economicIndicators" });

  const org = await requireAuth();
  if (!org) redirect("/sign-in");

  const { indicators, lastUpdated, source, attribution, isFallback } =
    await fetchEconomicIndicators(locale);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">{t("subtitle")}</p>
        </div>
        <form action={refreshIndicators}>
          <Button type="submit" variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t("refresh")}
          </Button>
        </form>
      </div>

      {isFallback && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">{t("fallback.title")}</p>
            <p className="text-sm opacity-90">{t("fallback.description")}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {indicators.map((indicator) => (
          <Card key={indicator.id} className="feature-card">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">
                    {indicator.name}
                  </CardTitle>
                </div>
                <TrendBadge trend={indicator.trend} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">
                  {indicator.value}
                </span>
                <span className="text-sm text-muted-foreground">
                  {indicator.unit}
                </span>
              </div>
              {indicator.previousValue !== "—" && (
                <p className="text-xs text-muted-foreground">
                  {t("baseValue", { value: indicator.previousValue })}
                </p>
              )}
              {indicator.description && (
                <p className="text-xs text-muted-foreground">
                  {indicator.description}
                </p>
              )}
              <div className="flex items-center justify-between pt-2">
                <Badge variant="secondary" className="text-xs">
                  {indicator.source}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {indicator.date}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <p>
          <strong>{t("source")}</strong> {source}
        </p>
        <p className="mt-1">{attribution}</p>
        <p className="mt-1">
          <strong>{t("lastUpdate")}</strong> {formatLastUpdated(lastUpdated, locale)}
        </p>
      </div>
    </div>
  );
}