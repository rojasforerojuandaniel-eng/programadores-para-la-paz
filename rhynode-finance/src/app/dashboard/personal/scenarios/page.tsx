"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  TrendingUp,
  PiggyBank,
  DollarSign,
  RotateCcw,
  AlertTriangle,
  Lightbulb,
  Calendar,
} from "lucide-react";
import dynamic from "next/dynamic";
import { parseISO, format } from "date-fns";
import {
  type ScenarioData,
  ScenarioChartSkeleton,
} from "@/components/dashboard/scenario-chart";
import { toast } from "sonner";

const ScenarioChart = dynamic(
  () =>
    import("@/components/dashboard/scenario-chart").then((mod) => mod.ScenarioChart),
  { ssr: false, loading: ScenarioChartSkeleton }
);

interface ScenarioSummary {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  currency: string;
}

interface ForecastProjectionMonth {
  month: string;
  monthIndex: number;
  baseIncome: number;
  baseExpenses: number;
  recurringIncome: number;
  recurringExpenses: number;
  variableIncome: number;
  variableExpenses: number;
  eventIncome: number;
  eventExpenses: number;
  net: number;
  baseBalance: number;
  optimisticBalance: number;
  pessimisticBalance: number;
  events: string[];
}

interface ForecastSummary {
  currentBalance: number;
  monthsToProject: number;
  finalBaseBalance: number;
  finalOptimisticBalance: number;
  finalPessimisticBalance: number;
  riskMonth: string | null;
  lowestBalance: number;
  averageMonthlyNet: number;
  recommendation: string;
}

interface ForecastResponse {
  projection: ForecastProjectionMonth[];
  summary: ForecastSummary;
  currency: string;
  recurringCount: number;
  hasInvoices: boolean;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function monthLabel(month: string) {
  return format(parseISO(`${month}-01`), "MMM yyyy");
}

const defaultSummary: ScenarioSummary = {
  currentBalance: 5_000_000,
  monthlyIncome: 5_000_000,
  monthlyExpenses: 3_500_000,
  monthlySavings: 500_000,
  currency: "COP",
};

export default function ScenariosPage() {
  const [summary, setSummary] = useState<ScenarioSummary | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthsToProject, setMonthsToProject] = useState(12);
  const [includeAguinaldo, setIncludeAguinaldo] = useState(true);
  const [includePrima, setIncludePrima] = useState(true);
  const [includeIva, setIncludeIva] = useState(true);

  const activeSummary = summary ?? defaultSummary;

  useEffect(() => {
    async function loadSummary() {
      try {
        const response = await fetch("/api/personal/scenarios/summary");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as ScenarioSummary;
        setSummary(data);
      } catch {
        // Defaults keep the page usable if the summary API fails.
      }
    }
    loadSummary();
  }, []);

  useEffect(() => {
    async function loadForecast() {
      setLoading(true);
      try {
        const url = new URL("/api/personal/forecast", window.location.origin);
        url.searchParams.set("months", String(monthsToProject));
        url.searchParams.set("aguinaldo", String(includeAguinaldo));
        url.searchParams.set("prima", String(includePrima));
        url.searchParams.set("iva", String(includeIva));

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as ForecastResponse;
        setForecast(data);
      } catch {
        toast.error("No se pudo cargar la proyección. Intenta de nuevo.");
        setForecast(null);
      } finally {
        setLoading(false);
      }
    }
    loadForecast();
  }, [monthsToProject, includeAguinaldo, includePrima, includeIva]);

  const chartData: ScenarioData[] = useMemo(() => {
    if (!forecast) return [];
    return forecast.projection.map((p) => ({
      month: monthLabel(p.month),
      base: p.baseBalance,
      optimistic: p.optimisticBalance,
      pessimistic: p.pessimisticBalance,
    }));
  }, [forecast]);

  function reset() {
    setMonthsToProject(12);
    setIncludeAguinaldo(true);
    setIncludePrima(true);
    setIncludeIva(true);
  }

  const finalBalance = forecast?.summary.finalBaseBalance ?? activeSummary.currentBalance;
  const riskMonth = forecast?.summary.riskMonth ?? null;
  const recommendation = forecast?.summary.recommendation ?? "";
  const currency = forecast?.currency ?? activeSummary.currency;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">Simulador de Escenarios</h1>
          <p className="body-default mt-1">
            Proyección de flujo de caja con estacionalidad, recurrentes y eventos Colombianos
          </p>
        </div>
        <Button variant="outline" onClick={reset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reiniciar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Balance actual"
          value={
            loading ? (
              <div className="h-6 w-24 animate-pulse rounded bg-muted" />
            ) : (
              formatCurrency(activeSummary.currentBalance)
            )
          }
          icon={DollarSign}
        />
        <KpiCard
          label="Proyección final (base)"
          value={loading ? <div className="h-6 w-24 animate-pulse rounded bg-muted" /> : formatCurrency(finalBalance)}
          icon={TrendingUp}
          valueClassName={finalBalance >= activeSummary.currentBalance ? "text-emerald-500" : "text-rose-500"}
        />
        <KpiCard
          label="Mes de riesgo"
          value={
            loading ? (
              <div className="h-6 w-24 animate-pulse rounded bg-muted" />
            ) : riskMonth ? (
              monthLabel(riskMonth)
            ) : (
              "Sin riesgo"
            )
          }
          icon={AlertTriangle}
          valueClassName={riskMonth ? "text-rose-500" : "text-emerald-500"}
        />
        <KpiCard
          label="Recomendación"
          value={
            loading ? (
              <div className="h-6 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <span className="line-clamp-2 text-sm font-normal leading-snug">{recommendation}</span>
            )
          }
          icon={Lightbulb}
          className="sm:col-span-2 lg:col-span-1"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card className="surface-elevated-2 rounded-xl border-border">
            <CardHeader className="pb-3">
              <CardTitle className="heading-card flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-primary" />
                Horizonte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <Label className="text-sm">Meses a proyectar</Label>
                <Select
                  value={String(monthsToProject)}
                  onValueChange={(v) => setMonthsToProject(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona meses" />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 6, 12, 24].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m} meses
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated-2 rounded-xl border-border">
            <CardHeader className="pb-3">
              <CardTitle className="heading-card flex items-center gap-2 text-base">
                <PiggyBank className="h-4 w-4 text-primary" />
                Eventos Colombianos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Aguinaldo (diciembre)</Label>
                  <p className="text-xs text-muted-foreground">
                    +1 ingreso medio en diciembre
                  </p>
                </div>
                <Switch
                  checked={includeAguinaldo}
                  onCheckedChange={setIncludeAguinaldo}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">Prima (junio)</Label>
                  <p className="text-xs text-muted-foreground">
                    +1 ingreso medio en junio
                  </p>
                </div>
                <Switch
                  checked={includePrima}
                  onCheckedChange={setIncludePrima}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">IVA bimestral</Label>
                  <p className="text-xs text-muted-foreground">
                    Solo si tienes facturas emitidas
                  </p>
                </div>
                <Switch
                  checked={includeIva}
                  onCheckedChange={setIncludeIva}
                  disabled={!forecast?.hasInvoices}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated-2 rounded-xl border-border">
            <CardHeader className="pb-3">
              <CardTitle className="heading-card text-base">Sobre la proyección</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                La línea <strong className="text-foreground">Base</strong> usa tu historial,
                transacciones recurrentes e índices de estacionalidad.
              </p>
              <p>
                <strong className="text-emerald-500">Optimista</strong> (+10% ingresos, -5% gastos)
                y <strong className="text-rose-500">Pesimista</strong> (-10% ingresos, +10% gastos)
                muestran rangos de confianza.
              </p>
              {forecast && (
                <p>
                  {forecast.recurringCount} recurrentes activas consideradas · moneda {currency}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card className="surface-elevated-2 rounded-xl border-border">
            <CardHeader className="pb-3">
              <CardTitle className="heading-card text-base">Evolución del saldo</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <ScenarioChartSkeleton /> : <ScenarioChart data={chartData} />}
            </CardContent>
          </Card>

          <Card className="surface-elevated-2 rounded-xl border-border">
            <CardHeader className="pb-3">
              <CardTitle className="heading-card text-base">Proyección mensual</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Gastos</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Optimista</TableHead>
                    <TableHead className="text-right">Pesimista</TableHead>
                    <TableHead>Eventos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}>
                            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : forecast ? (
                    forecast.projection.map((p) => (
                      <TableRow key={p.month}>
                        <TableCell className="font-medium">{monthLabel(p.month)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.baseIncome)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.baseExpenses)}</TableCell>
                        <TableCell
                          className={`text-right ${p.net >= 0 ? "text-emerald-500" : "text-rose-500"}`}
                        >
                          {p.net >= 0 ? "+" : ""}
                          {formatCurrency(p.net)}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(p.baseBalance)}</TableCell>
                        <TableCell className="text-right text-emerald-500">{formatCurrency(p.optimisticBalance)}</TableCell>
                        <TableCell className="text-right text-rose-500">{formatCurrency(p.pessimisticBalance)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {p.events.map((event) => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
