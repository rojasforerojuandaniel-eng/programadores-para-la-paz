import { fetchEconomicIndicators } from "@/lib/economic-indicators";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { dashboardMetadata } from "@/lib/dashboard-metadata";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendBadge } from "./trend-badge";
import { Globe, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revalidatePath } from "next/cache";

export const metadata = dashboardMetadata(
  "Indicadores Económicos",
  "Tasas de referencia de Colombia: TRM, inflación, tasa de intervención, UVR e IBR."
);

function formatLastUpdated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function refreshIndicators() {
  "use server";
  revalidatePath("/dashboard/economic-indicators");
}

export default async function EconomicIndicatorsPage() {
  const org = await requireAuth();
  if (!org) redirect("/sign-in");

  const { indicators, lastUpdated, source, attribution, isFallback } =
    await fetchEconomicIndicators();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">Indicadores Económicos</h1>
          <p className="body-default mt-1">
            Datos de referencia de Colombia actualizados diariamente
          </p>
        </div>
        <form action={refreshIndicators}>
          <Button type="submit" variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </form>
      </div>

      {isFallback && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Mostrando datos de respaldo</p>
            <p className="text-sm opacity-90">
              No pudimos conectarnos con la fuente oficial. Los valores mostrados son de referencia y pueden no reflejar el mercado actual.
            </p>
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
                  Valor base / meta: {indicator.previousValue}
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
          <strong>Fuente:</strong> {source}
        </p>
        <p className="mt-1">{attribution}</p>
        <p className="mt-1">
          <strong>Última actualización:</strong> {formatLastUpdated(lastUpdated)}
        </p>
      </div>
    </div>
  );
}
