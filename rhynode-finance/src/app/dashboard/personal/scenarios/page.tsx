"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  TrendingUp,
  PiggyBank,
  Briefcase,
  ShoppingBag,
  DollarSign,
  RotateCcw,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  type ScenarioData,
  ScenarioChartSkeleton,
} from "@/components/dashboard/scenario-chart";

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
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
  const [loading, setLoading] = useState(true);

  const [salaryIncrease, setSalaryIncrease] = useState(0);
  const [newExpense, setNewExpense] = useState(0);
  const [largePurchase, setLargePurchase] = useState(0);
  const [largePurchaseMonths, setLargePurchaseMonths] = useState(12);
  const [monthlySavings, setMonthlySavings] = useState(defaultSummary.monthlySavings);
  const [currentBalance, setCurrentBalance] = useState(defaultSummary.currentBalance);
  const [monthsToProject, setMonthsToProject] = useState(24);

  const activeSummary = summary ?? defaultSummary;
  const monthlyIncome = activeSummary.monthlyIncome;
  const monthlyExpenses = activeSummary.monthlyExpenses;

  useEffect(() => {
    async function loadSummary() {
      try {
        const response = await fetch("/api/personal/scenarios/summary");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as ScenarioSummary;
        setSummary(data);
        setCurrentBalance(data.currentBalance);
        setMonthlySavings(data.monthlySavings);
      } catch (error) {
        // Keep defaults on error; no need to surface noise in a simulator.
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, []);

  const data: ScenarioData[] = [];
  let baseline = currentBalance;
  let projected = currentBalance;

  for (let i = 1; i <= monthsToProject; i++) {
    const monthIncome = monthlyIncome * (1 + salaryIncrease / 100);
    const monthExpense = monthlyExpenses + newExpense;
    const purchasePayment =
      largePurchase > 0 && i <= largePurchaseMonths ? largePurchase / largePurchaseMonths : 0;

    baseline += monthlyIncome - monthlyExpenses - purchasePayment + monthlySavings;
    projected += monthIncome - monthExpense - purchasePayment + monthlySavings;

    data.push({
      month: `Mes ${i}`,
      baseline: Math.round(baseline),
      projected: Math.round(projected),
    });
  }

  const projectedFinal = data.length > 0 ? data[data.length - 1].projected : currentBalance;
  const baselineFinal = data.length > 0 ? data[data.length - 1].baseline : currentBalance;
  const difference = projectedFinal - baselineFinal;

  function reset() {
    setSalaryIncrease(0);
    setNewExpense(0);
    setLargePurchase(0);
    setLargePurchaseMonths(12);
    setMonthlySavings(activeSummary.monthlySavings);
    setCurrentBalance(activeSummary.currentBalance);
    setMonthsToProject(24);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">Simulador de Escenarios</h1>
          <p className="body-default mt-1">
            Juega con variables y proyecta tu futuro financiero
          </p>
        </div>
        <Button variant="outline" onClick={reset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reiniciar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Balance actual"
          value={
            loading ? (
              <div className="h-6 w-24 animate-pulse rounded bg-muted" />
            ) : (
              formatCurrency(currentBalance)
            )
          }
          icon={DollarSign}
        />
        <KpiCard
          label="Proyección final"
          value={formatCurrency(projectedFinal)}
          icon={TrendingUp}
          valueClassName="text-primary"
        />
        <KpiCard
          label="Diferencia vs. base"
          value={`${difference >= 0 ? "+" : ""}${formatCurrency(difference)}`}
          icon={PiggyBank}
          valueClassName={difference >= 0 ? "text-emerald-500" : "text-rose-500"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card className="surface-elevated-2 rounded-xl border-border">
            <CardHeader className="pb-3">
              <CardTitle className="heading-card flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4 text-primary" />
                Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <Label>Ingreso mensual actual</Label>
                  <span className="font-medium text-muted-foreground">
                    {formatCurrency(monthlyIncome)}
                  </span>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm">Aumento de salario: {salaryIncrease}%</Label>
                  <Slider
                    value={[salaryIncrease]}
                    onValueChange={(v) => setSalaryIncrease(v[0])}
                    max={100}
                    step={5}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-sm">Ahorro mensual objetivo</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={monthlySavings}
                    onChange={(e) => setMonthlySavings(Number(e.target.value))}
                    className="flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated-2 rounded-xl border-border">
            <CardHeader className="pb-3">
              <CardTitle className="heading-card flex items-center gap-2 text-base">
                <ShoppingBag className="h-4 w-4 text-primary" />
                Gastos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <Label>Gasto mensual actual</Label>
                  <span className="font-medium text-muted-foreground">
                    {formatCurrency(monthlyExpenses)}
                  </span>
                </div>
                <Label className="text-sm">Nuevo gasto mensual</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={newExpense}
                    onChange={(e) => setNewExpense(Number(e.target.value))}
                    className="flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated-2 rounded-xl border-border">
            <CardHeader className="pb-3">
              <CardTitle className="heading-card flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Compra Grande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <Label className="text-sm">Valor de la compra</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={largePurchase}
                    onChange={(e) => setLargePurchase(Number(e.target.value))}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-sm">Meses de financiación: {largePurchaseMonths}</Label>
                <Slider
                  value={[largePurchaseMonths]}
                  onValueChange={(v) => setLargePurchaseMonths(v[0])}
                  min={1}
                  max={60}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated-2 rounded-xl border-border">
            <CardHeader className="pb-3">
              <CardTitle className="heading-card flex items-center gap-2 text-base">
                <PiggyBank className="h-4 w-4 text-primary" />
                Balance Inicial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <Label className="text-sm">Balance actual</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(Number(e.target.value))}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-sm">Meses a proyectar: {monthsToProject}</Label>
                <Slider
                  value={[monthsToProject]}
                  onValueChange={(v) => setMonthsToProject(v[0])}
                  min={6}
                  max={60}
                  step={6}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="surface-elevated-2 h-full rounded-xl border-border">
            <CardHeader className="pb-3">
              <CardTitle className="heading-card text-base">Proyección Financiera</CardTitle>
            </CardHeader>
            <CardContent>
              <ScenarioChart data={data} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
