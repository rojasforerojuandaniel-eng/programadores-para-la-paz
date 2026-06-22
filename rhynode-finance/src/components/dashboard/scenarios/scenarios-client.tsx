"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BottomSheet,
  BottomSheetTrigger,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetClose,
} from "@/components/ui/bottom-sheet";
import {
  TrendingUp,
  PiggyBank,
  RotateCcw,
  AlertTriangle,
  Calendar,
  ChevronDown,
  Gift,
  Sun,
  Receipt,
  BarChart3,
  Table2,
  SlidersHorizontal,
  RefreshCw,
  Plus,
  GitBranch,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  type ScenarioData,
  ScenarioChartSkeleton,
} from "@/components/dashboard/scenario-chart";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { formatCurrency as formatCurrencyLocale, formatDate as fmtDate } from "@/lib/format";
import type { Locale } from "@/lib/locale";
import {
  ScenarioCard,
} from "./scenario-card";
import {
  ScenarioForm,
} from "./scenario-form";
import {
  ScenarioProjectionChart,
} from "./scenario-projection-chart";
import {
  calculateScenarioProjection,
  sortScenarios,
  type Scenario,
  type ScenarioSummary,
} from "@/lib/scenarios";

const ScenarioChart = dynamic(
  () =>
    import("@/components/dashboard/scenario-chart").then((mod) => mod.ScenarioChart),
  { ssr: false, loading: ScenarioChartSkeleton }
);

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

const HORIZON_OPTIONS = [3, 6, 12, 24];

function formatDelta(delta: number) {
  if (!Number.isFinite(delta)) return "—";
  const sign = delta >= 0 ? "+" : "-";
  return `${sign}${Math.abs(delta).toFixed(1)}%`;
}

function monthLabel(month: string, locale: Locale) {
  return fmtDate(`${month}-01`, locale, { month: "short", year: "numeric" });
}

interface ScenarioSummaryCardProps {
  variant: "optimistic" | "base" | "pessimistic";
  title: string;
  balance: number;
  currentBalance: number;
  currency: string;
  loading: boolean;
}

function ScenarioSummaryCard({
  variant,
  title,
  balance,
  currentBalance,
  currency,
  loading,
}: ScenarioSummaryCardProps) {
  const t = useTranslations("dashboard.scenarios");
  const locale = useLocale() as Locale;
  const delta =
    currentBalance > 0 ? ((balance - currentBalance) / currentBalance) * 100 : 0;
  const positive = delta >= 0;

  const styles = {
    optimistic: {
      border: "border-emerald-500/20",
      bg: "bg-emerald-500/10",
      text: "text-emerald-600",
      iconColor: "text-emerald-500",
    },
    base: {
      border: "border-primary/20",
      bg: "bg-primary/10",
      text: "text-primary",
      iconColor: "text-primary",
    },
    pessimistic: {
      border: "border-rose-500/20",
      bg: "bg-rose-500/10",
      text: "text-rose-600",
      iconColor: "text-rose-500",
    },
  }[variant];

  const Icon =
    variant === "optimistic"
      ? TrendingUp
      : variant === "pessimistic"
        ? AlertTriangle
        : PiggyBank;

  return (
    <Card
      className={cn(
        "surface-elevated-2 rounded-xl border-border",
        styles.border
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground sm:text-base">
              {title}
            </p>
            {loading ? (
              <div className="mt-2 h-7 w-32 animate-pulse rounded bg-muted sm:h-8 sm:w-40" />
            ) : (
              <p
                className={cn(
                  "mt-1 text-xl font-bold tracking-tight sm:mt-2 sm:text-2xl",
                  styles.text
                )}
              >
                {formatCurrencyLocale(balance, currency, locale)}
              </p>
            )}
            {loading ? (
              <div className="mt-2 h-5 w-20 animate-pulse rounded bg-muted" />
            ) : (
              <Badge
                variant="outline"
                className={cn(
                  "mt-2 text-xs font-medium",
                  positive
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                    : "border-rose-500/20 bg-rose-500/10 text-rose-600"
                )}
              >
                {formatDelta(delta)} {t("summary.vsToday")}
              </Badge>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11",
              styles.bg,
              styles.iconColor
            )}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface EventToggleProps {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function EventToggle({
  id,
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: EventToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border p-4 transition-colors",
        checked ? "border-primary/30 bg-primary/5" : "border-border bg-card",
        disabled && "opacity-60"
      )}
      onClick={() => !disabled && onCheckedChange(!checked)}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
          checked
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <Label className="text-base font-medium">{title}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <span onClick={(e) => e.stopPropagation()}>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-label={title}
        />
      </span>
    </div>
  );
}

interface CompactScenarioTableProps {
  projection: ForecastProjectionMonth[];
  currency: string;
}

function CompactScenarioTable({
  projection,
  currency,
}: CompactScenarioTableProps) {
  const t = useTranslations("dashboard.scenarios");
  const locale = useLocale() as Locale;
  return (
    <div className="relative overflow-auto rounded-xl border max-h-[45vh] sm:max-h-[55vh] lg:max-h-[65vh]">
      <table className="w-full caption-bottom text-sm">
        <thead className="sticky top-0 z-10 bg-card [&_tr]:border-b">
          <tr className="border-b">
            <th scope="col" className="h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground">
              {t("table.month")}
            </th>
            <th scope="col" className="h-10 px-2 text-right align-middle font-medium whitespace-nowrap text-foreground">
              {t("table.net")}
            </th>
            <th scope="col" className="h-10 px-2 text-right align-middle font-medium whitespace-nowrap text-foreground">
              {t("table.base")}
            </th>
            <th scope="col" className="h-10 px-2 text-right align-middle font-medium whitespace-nowrap text-foreground">
              {t("table.optimistic")}
            </th>
            <th scope="col" className="h-10 px-2 text-right align-middle font-medium whitespace-nowrap text-foreground">
              {t("table.pessimistic")}
            </th>
            <th scope="col" className="h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground">
              {t("table.events")}
            </th>
          </tr>
        </thead>
        <tbody>
          {projection.map((p) => (
            <tr
              key={p.month}
              className="border-b transition-colors hover:bg-muted/50"
            >
              <td className="p-2 align-middle font-medium">{monthLabel(p.month, locale)}</td>
              <td
                className={cn(
                  "p-2 text-right align-middle",
                  p.net >= 0 ? "text-emerald-500" : "text-rose-500"
                )}
              >
                {p.net >= 0 ? "+" : ""}
                {formatCurrencyLocale(p.net, currency, locale)}
              </td>
              <td className="p-2 text-right align-middle font-medium">
                {formatCurrencyLocale(p.baseBalance, currency, locale)}
              </td>
              <td className="p-2 text-right align-middle text-emerald-500">
                {formatCurrencyLocale(p.optimisticBalance, currency, locale)}
              </td>
              <td className="p-2 text-right align-middle text-rose-500">
                {formatCurrencyLocale(p.pessimisticBalance, currency, locale)}
              </td>
              <td className="p-2 align-middle">
                <div className="flex flex-wrap gap-1">
                  {p.events.map((event) => (
                    <Badge key={event} variant="outline" className="text-xs">
                      {event}
                    </Badge>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScenarioTableSkeleton() {
  return (
    <div className="relative overflow-auto rounded-xl border max-h-[45vh] sm:max-h-[55vh] lg:max-h-[65vh]">
      <table className="w-full caption-bottom text-sm">
        <thead className="sticky top-0 z-10 bg-card">
          <tr>
            {Array.from({ length: 6 }).map((_, i) => (
              <th key={i} className="h-10 px-2">
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 4 }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: 6 }).map((__, j) => (
                <td key={j} className="p-2">
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface MobileHorizonSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

function MobileHorizonSelector({ value, onChange }: MobileHorizonSelectorProps) {
  const t = useTranslations("dashboard.scenarios");
  const [open, setOpen] = useState(false);

  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      <BottomSheetTrigger asChild>
        <Button
          variant="outline"
          className="h-12 w-full justify-between gap-2 text-base"
          aria-label={t("mobileHorizon.ariaLabel")}
        >
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {t("mobileHorizon.months", { count: value })}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </BottomSheetTrigger>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>{t("mobileHorizon.title")}</BottomSheetTitle>
          <BottomSheetDescription>
            {t("mobileHorizon.description")}
          </BottomSheetDescription>
        </BottomSheetHeader>
        <div className="space-y-2 py-4">
          {HORIZON_OPTIONS.map((m) => (
            <BottomSheetClose asChild key={m}>
              <Button
                variant={value === m ? "default" : "outline"}
                className="h-12 w-full justify-start text-base"
                onClick={() => onChange(m)}
              >
                {t("mobileHorizon.months", { count: m })}
              </Button>
            </BottomSheetClose>
          ))}
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}

interface ForecastEmptyStateProps {
  onRetry: () => void;
}

function ForecastEmptyState({ onRetry }: ForecastEmptyStateProps) {
  const t = useTranslations("dashboard.scenarios");
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <AlertTriangle className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{t("emptyState.title")}</p>
        <p className="text-sm text-muted-foreground">
          {t("emptyState.description")}
        </p>
      </div>
      <Button variant="outline" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        {t("emptyState.retry")}
      </Button>
    </div>
  );
}

interface ScenariosClientProps {
  initialSummary: ScenarioSummary;
  initialScenarios: Scenario[];
}

export function ScenariosClient({
  initialSummary,
  initialScenarios,
}: ScenariosClientProps) {
  const t = useTranslations("dashboard.scenarios");
  const locale = useLocale() as Locale;
  const [summary] = useState<ScenarioSummary>(initialSummary);
  const [scenarios, setScenarios] = useState<Scenario[]>(
    sortScenarios(initialScenarios)
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);

  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthsToProject, setMonthsToProject] = useState(12);
  const [includeAguinaldo, setIncludeAguinaldo] = useState(true);
  const [includePrima, setIncludePrima] = useState(true);
  const [includeIva, setIncludeIva] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    async function loadScenarios() {
      try {
        const response = await fetch("/api/personal/scenarios");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as { scenarios: Scenario[] };
        setScenarios(sortScenarios(data.scenarios));
      } catch {
        // Keep initial scenarios if the API fails.
      }
    }
    loadScenarios();
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
        toast.error(t("toast.loadError"));
        setForecast(null);
      } finally {
        setLoading(false);
      }
    }
    loadForecast();
  }, [monthsToProject, includeAguinaldo, includePrima, includeIva, retryCount]);

  const chartData: ScenarioData[] = useMemo(() => {
    if (!forecast) return [];
    return forecast.projection.map((p) => ({
      month: monthLabel(p.month, locale),
      base: p.baseBalance,
      optimistic: p.optimisticBalance,
      pessimistic: p.pessimisticBalance,
    }));
  }, [forecast, locale]);

  async function handleCreate(data: {
    name: string;
    type: Scenario["type"];
    incomeAdjustment: number;
    expenseAdjustment: number;
    durationMonths: number;
  }) {
    setIsCreating(true);
    try {
      const response = await fetch("/api/personal/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = (await response.json()) as { scenario: Scenario };
      setScenarios((prev) => sortScenarios([result.scenario, ...prev]));
      setIsFormOpen(false);
      toast.success(t("toast.saved"));
    } catch {
      toast.error(t("toast.saveError"));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/personal/scenarios?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setScenarios((prev) => prev.filter((s) => s.id !== id));
      toast.success(t("toast.deleted"));
    } catch {
      toast.error(t("toast.deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  function reset() {
    setMonthsToProject(12);
    setIncludeAguinaldo(true);
    setIncludePrima(true);
    setIncludeIva(true);
  }

  const currency = forecast?.currency ?? summary.currency;
  const currentBalance = summary.currentBalance;
  const selectedResult = selectedScenario
    ? calculateScenarioProjection(selectedScenario, summary)
    : null;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="heading-section">{t("title")}</h1>
            <p className="body-default mt-1">
              {t("subtitle")}
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("newScenario")}
          </Button>
        </div>

        {scenarios.length === 0 ? (
          <EmptyStateCard
            variant="md"
            icon={GitBranch}
            title={t("empty.title")}
            description={t("empty.description")}
            action={
              <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t("empty.action")}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                summary={summary}
                onDelete={handleDelete}
                onSimulate={(s) => setSelectedScenario(s)}
                isDeleting={deletingId === scenario.id}
              />
            ))}
          </div>
        )}
      </section>

      <ScenarioForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreate}
        isSubmitting={isCreating}
      />

      <Dialog
        open={selectedScenario !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedScenario(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedScenario?.name
                ? t("dialog.projectionWithName", { name: selectedScenario.name })
                : t("dialog.projectionTitle")}
            </DialogTitle>
          </DialogHeader>
          {selectedResult && (
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card className="surface-elevated-2 rounded-xl border-border">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{t("card.finalBalance")}</p>
                    <p className="text-sm font-semibold sm:text-base">
                      {formatCurrencyLocale(selectedResult.finalBalance, currency, locale)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="surface-elevated-2 rounded-xl border-border">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{t("card.accumulatedSavings")}</p>
                    <p className="text-sm font-semibold sm:text-base">
                      {formatCurrencyLocale(selectedResult.totalSavings, currency, locale)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="surface-elevated-2 rounded-xl border-border">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{t("card.breakEvenPoint")}</p>
                    <p className="text-sm font-semibold sm:text-base">
                      {selectedResult.breakEvenMonth
                        ? t("card.monthPrefix", { month: selectedResult.breakEvenMonth })
                        : t("card.noBreakEven")}
                    </p>
                  </CardContent>
                </Card>
                <Card className="surface-elevated-2 rounded-xl border-border">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{t("card.vsBase")}</p>
                    <p
                      className={cn(
                        "text-sm font-semibold sm:text-base",
                        selectedResult.deltaVsBaseline >= 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                      )}
                    >
                      {selectedResult.deltaVsBaseline >= 0 ? "+" : ""}
                      {formatCurrencyLocale(selectedResult.deltaVsBaseline, currency, locale)}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <ScenarioProjectionChart
                projection={selectedResult.projection}
                currency={currency}
                title={t("card.evolutionTitle")}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="heading-section text-xl">{t("simulator.title")}</h2>
            <p className="body-default mt-1">
              {t("simulator.subtitle")}
            </p>
          </div>
          <Button variant="outline" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {t("simulator.reset")}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ScenarioSummaryCard
            variant="optimistic"
            title={t("summary.optimistic")}
            balance={forecast?.summary.finalOptimisticBalance ?? currentBalance}
            currentBalance={currentBalance}
            currency={currency}
            loading={loading}
          />
          <ScenarioSummaryCard
            variant="base"
            title={t("summary.base")}
            balance={forecast?.summary.finalBaseBalance ?? currentBalance}
            currentBalance={currentBalance}
            currency={currency}
            loading={loading}
          />
          <ScenarioSummaryCard
            variant="pessimistic"
            title={t("summary.pessimistic")}
            balance={forecast?.summary.finalPessimisticBalance ?? currentBalance}
            currentBalance={currentBalance}
            currency={currency}
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <Card className="surface-elevated-2 rounded-xl border-border">
              <CardHeader className="pb-3">
                <CardTitle className="heading-card flex items-center gap-2 text-base">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  {t("config.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    {t("config.horizon")}
                  </Label>
                  <div className="block sm:hidden">
                    <MobileHorizonSelector
                      value={monthsToProject}
                      onChange={setMonthsToProject}
                    />
                  </div>
                  <div className="hidden sm:block">
                    <Select
                      value={String(monthsToProject)}
                      onValueChange={(v) => setMonthsToProject(Number(v))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("config.selectMonths")} />
                      </SelectTrigger>
                      <SelectContent>
                        {HORIZON_OPTIONS.map((m) => (
                          <SelectItem key={m} value={String(m)}>
                            {t("config.months", { count: m })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t("config.colombianEvents")}</Label>
                  <div className="space-y-3">
                    <EventToggle
                      id="aguinaldo-toggle"
                      icon={Gift}
                      title={t("events.aguinaldo.title")}
                      description={t("events.aguinaldo.description")}
                      checked={includeAguinaldo}
                      onCheckedChange={setIncludeAguinaldo}
                    />
                    <EventToggle
                      id="prima-toggle"
                      icon={Sun}
                      title={t("events.prima.title")}
                      description={t("events.prima.description")}
                      checked={includePrima}
                      onCheckedChange={setIncludePrima}
                    />
                    <EventToggle
                      id="iva-toggle"
                      icon={Receipt}
                      title={t("events.iva.title")}
                      description={t("events.iva.description")}
                      checked={includeIva}
                      onCheckedChange={setIncludeIva}
                      disabled={!forecast?.hasInvoices}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="surface-elevated-2 rounded-xl border-border">
              <CardHeader className="pb-3">
                <CardTitle className="heading-card flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  {t("balanceEvolution.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <ScenarioChartSkeleton />
                ) : (
                  <ScenarioChart data={chartData} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="surface-elevated-2 rounded-xl border-border flex h-full flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="heading-card flex items-center gap-2 text-base">
                  <Table2 className="h-4 w-4 text-primary" />
                  {t("monthlyProjection.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0 sm:p-0">
                {loading ? (
                  <ScenarioTableSkeleton />
                ) : forecast ? (
                  <CompactScenarioTable
                    projection={forecast.projection}
                    currency={currency}
                  />
                ) : (
                  <ForecastEmptyState onRetry={() => setRetryCount((c) => c + 1)} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
