"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate as fmtDate } from "@/lib/format";
import type { Locale } from "@/lib/locale";
import {
  Calculator,
  Info,
  ArrowLeft,
  ArrowRight,
  FileText,
  FileSpreadsheet,
  Receipt,
  Landmark,
  Wallet,
  Percent,
  Coins,
  CircleDollarSign,
  RotateCcw,
} from "lucide-react";

type TFn = (key: string, values?: Record<string, string | number>) => string;

const icaRates: Record<string, { label: string; perThousand: number }> = {
  bogota: { label: "Bogotá", perThousand: 9.66 },
  medellin: { label: "Medellín", perThousand: 13.8 },
  cali: { label: "Cali", perThousand: 10.2 },
  barranquilla: { label: "Barranquilla", perThousand: 7.0 },
  cartagena: { label: "Cartagena", perThousand: 8.2 },
  bucaramanga: { label: "Bucaramanga", perThousand: 11.0 },
};

const MAX_SLIDER_AMOUNT = 50_000_000;
const SLIDER_STEP = 100_000;

function formatCOP(amount: number, locale: Locale): string {
  return formatCurrency(amount, "COP", locale);
}

function getReteFuenteRate(amount: number): number {
  if (amount <= 1_000_000) return 0;
  if (amount <= 5_000_000) return 0.01;
  if (amount <= 10_000_000) return 0.02;
  if (amount <= 50_000_000) return 0.03;
  return 0.04;
}

function formatRate(rate: number, taxType: TaxType, city?: string): string {
  if (taxType === "ICA") {
    const perThousand = city ? icaRates[city]?.perThousand : undefined;
    return perThousand ? `${perThousand}‰` : "9.66‰";
  }
  if (rate === 0) return "0%";
  return `${(rate * 100).toFixed(rate % 0.01 === 0 ? 0 : 1)}%`;
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function clampAmount(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

const steps = [
  {
    id: 1,
    labelKey: "calculator.steps.income.label",
    descKey: "calculator.steps.income.desc",
  },
  {
    id: 2,
    labelKey: "calculator.steps.deductions.label",
    descKey: "calculator.steps.deductions.desc",
  },
  {
    id: 3,
    labelKey: "calculator.steps.regime.label",
    descKey: "calculator.steps.regime.desc",
  },
  {
    id: 4,
    labelKey: "calculator.steps.results.label",
    descKey: "calculator.steps.results.desc",
  },
] as const;

type TaxType = "IVA" | "ReteFuente" | "ICA";

interface CalculationResult {
  base: number;
  deductions: number;
  taxableBase: number;
  taxType: TaxType;
  city?: string;
  rate: number;
  rateLabel: string;
  tax: number;
  total: number;
  netPayable?: number;
  generatedAt: string;
}

function calculate(
  base: number,
  deductions: number,
  taxType: TaxType,
  city?: string
): CalculationResult {
  const safeBase = Math.max(0, base);
  const safeDeductions = Math.max(0, Math.min(deductions, safeBase));
  const taxableBase = safeBase - safeDeductions;
  const now = new Date().toISOString();

  if (taxType === "IVA") {
    const rate = 0.19;
    const generated = safeBase * rate;
    const deductible = safeDeductions * rate;
    const netPayable = Math.max(0, generated - deductible);
    return {
      base: safeBase,
      deductions: safeDeductions,
      taxableBase,
      taxType,
      rate,
      rateLabel: formatRate(rate, taxType),
      tax: generated,
      total: safeBase + generated,
      netPayable,
      generatedAt: now,
    };
  }

  if (taxType === "ReteFuente") {
    const rate = getReteFuenteRate(safeBase);
    const tax = safeBase * rate;
    return {
      base: safeBase,
      deductions: 0,
      taxableBase: safeBase,
      taxType,
      rate,
      rateLabel: formatRate(rate, taxType),
      tax,
      total: safeBase - tax,
      generatedAt: now,
    };
  }

  const perThousand = city ? icaRates[city]?.perThousand : 9.66;
  const rate = perThousand / 1000;
  const tax = safeBase * rate;
  return {
    base: safeBase,
    deductions: 0,
    taxableBase: safeBase,
    taxType,
    city,
    rate,
    rateLabel: formatRate(rate, taxType, city),
    tax,
    total: safeBase + tax,
    generatedAt: now,
  };
}

export function TaxCalculator() {
  const t = useTranslations("dashboard.tax");
  const locale = useLocale() as Locale;
  const [step, setStep] = useState(1);
  const [taxType, setTaxType] = useState<TaxType>("IVA");
  const [baseAmount, setBaseAmount] = useState("");
  const [deductions, setDeductions] = useState("");
  const [city, setCity] = useState<string>("bogota");
  const [result, setResult] = useState<CalculationResult | null>(null);

  const baseNumeric = clampAmount(baseAmount);
  const deductionsNumeric = clampAmount(deductions);

  const maxSlider = useMemo(
    () => Math.max(MAX_SLIDER_AMOUNT, baseNumeric, deductionsNumeric),
    [baseNumeric, deductionsNumeric]
  );

  function reset() {
    setStep(1);
    setTaxType("IVA");
    setBaseAmount("");
    setDeductions("");
    setCity("bogota");
    setResult(null);
  }

  function goToResults() {
    if (baseNumeric <= 0) {
      toast.error(t("calculator.toast.baseInvalid"));
      return;
    }
    const nextResult = calculate(
      baseNumeric,
      deductionsNumeric,
      taxType,
      taxType === "ICA" ? city : undefined
    );
    setResult(nextResult);
    setStep(4);
  }

  function handleExportPdf() {
    if (!result) return;
    exportCalculationPdf(result, t, locale).catch(() =>
      toast.error(t("calculator.toast.pdfError"))
    );
  }

  function handleExportExcel() {
    if (!result) return;
    exportCalculationExcel(result, t, locale).catch(() =>
      toast.error(t("calculator.toast.excelError"))
    );
  }

  const isIva = taxType === "IVA";

  return (
    <Card className="surface-elevated-2">
      <CardHeader>
        <CardTitle className="heading-card flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" aria-hidden={true} />
          {t("calculator.cardTitle")}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stepper */}
        <nav aria-label={t("calculator.stepsNavAria")}>
          <div className="relative">
            <div className="absolute top-[1.125rem] left-0 right-0 h-1 rounded-full bg-muted" />
            <div
              className="absolute top-[1.125rem] left-0 h-1 rounded-full bg-primary transition-all"
              style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
            />
            <ol className="relative z-10 flex items-start justify-between gap-2">
              {steps.map((s) => {
                const active = s.id === step;
                const completed = s.id < step;
                const stepLabel = t(s.labelKey as never);
                return (
                  <li key={s.id} className="flex flex-1 flex-col items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (s.id <= step || result) setStep(s.id);
                      }}
                      disabled={s.id > step && !result}
                      aria-current={active ? "step" : undefined}
                      aria-label={t("calculator.stepAria", {
                        id: s.id,
                        label: stepLabel,
                      })}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : completed
                            ? "border-primary bg-background text-primary"
                            : "border-muted bg-background text-muted-foreground",
                        s.id > step && !result && "cursor-not-allowed opacity-50"
                      )}
                    >
                      {completed ? (
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden={true}
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        s.id
                      )}
                    </button>
                    <span
                      className={cn(
                        "mt-2 hidden text-center text-xs font-medium sm:inline",
                        active ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {stepLabel}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </nav>

        {/* Step content */}
        <div className="min-h-[12rem]">
          {step === 1 && (
            <section aria-labelledby="step-1-title" className="space-y-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" aria-hidden={true} />
                <h2 id="step-1-title" className="text-lg font-semibold">
                  {t("calculator.steps.income.label")}
                </h2>
                <TooltipInfo>
                  {t("calculator.income.tooltip")}
                </TooltipInfo>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tax-base">
                    {t("calculator.income.baseLabel")}
                  </Label>
                  <Badge variant="outline" className="font-mono">
                    {formatCOP(baseNumeric, locale)}
                  </Badge>
                </div>
                <Input
                  id="tax-base"
                  type="number"
                  min={0}
                  step={1000}
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(e.target.value)}
                  placeholder="1,000,000"
                  className="text-base"
                />
                <Slider
                  id="tax-base-slider"
                  aria-label={t("calculator.income.sliderAria")}
                  value={[baseNumeric]}
                  max={maxSlider}
                  step={SLIDER_STEP}
                  onValueChange={([value]) => setBaseAmount(String(value ?? 0))}
                />
                <p className="text-xs text-muted-foreground">
                  {t("calculator.income.hint", {
                    max: formatCOP(MAX_SLIDER_AMOUNT, locale),
                  })}
                </p>
              </div>
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="step-2-title" className="space-y-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" aria-hidden={true} />
                <h2 id="step-2-title" className="text-lg font-semibold">
                  {t("calculator.steps.deductions.label")}
                </h2>
                <TooltipInfo>
                  {t("calculator.deductions.tooltip")}
                </TooltipInfo>
              </div>

              <div
                className={cn(
                  "space-y-3",
                  !isIva && "pointer-events-none opacity-60"
                )}
              >
                <div className="flex items-center justify-between">
                  <Label htmlFor="tax-deductions">
                    {t("calculator.deductions.label")}
                  </Label>
                  <Badge variant="outline" className="font-mono">
                    {formatCOP(deductionsNumeric, locale)}
                  </Badge>
                </div>
                <Input
                  id="tax-deductions"
                  type="number"
                  min={0}
                  step={1000}
                  value={deductions}
                  onChange={(e) => setDeductions(e.target.value)}
                  placeholder="0"
                  disabled={!isIva}
                  className="text-base"
                />
                <Slider
                  id="tax-deductions-slider"
                  aria-label={t("calculator.deductions.sliderAria")}
                  value={[deductionsNumeric]}
                  max={Math.max(maxSlider, baseNumeric)}
                  step={SLIDER_STEP}
                  onValueChange={([value]) =>
                    setDeductions(String(value ?? 0))
                  }
                  disabled={!isIva}
                />
              </div>

              {!isIva && (
                <p className="rounded-md border border-muted bg-muted/40 p-3 text-sm text-muted-foreground">
                  {t("calculator.deductions.notApplicable")}
                </p>
              )}
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="step-3-title" className="space-y-4">
              <div className="flex items-center gap-2">
                <Landmark
                  className="h-5 w-5 text-primary"
                  aria-hidden={true}
                />
                <h2 id="step-3-title" className="text-lg font-semibold">
                  {t("calculator.steps.regime.label")}
                </h2>
                <TooltipInfo>
                  {t("calculator.regime.tooltip")}
                </TooltipInfo>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tax-type">
                    {t("calculator.regime.taxTypeLabel")}
                  </Label>
                  <Select
                    value={taxType}
                    onValueChange={(value) => setTaxType(value as TaxType)}
                  >
                    <SelectTrigger id="tax-type">
                      <SelectValue
                        placeholder={t("calculator.regime.taxTypePlaceholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IVA">
                        {t("calculator.regime.taxTypes.IVA")}
                      </SelectItem>
                      <SelectItem value="ReteFuente">
                        {t("calculator.regime.taxTypes.ReteFuente")}
                      </SelectItem>
                      <SelectItem value="ICA">
                        {t("calculator.regime.taxTypes.ICA")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {taxType === "ICA" && (
                  <div className="space-y-2">
                    <Label htmlFor="tax-city">
                      {t("calculator.regime.cityLabel")}
                    </Label>
                    <Select value={city} onValueChange={setCity}>
                      <SelectTrigger id="tax-city">
                        <SelectValue
                          placeholder={t("calculator.regime.cityPlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(icaRates).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>
                            {label} ({icaRates[key].perThousand}‰)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="rounded-md border border-muted bg-muted/40 p-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {t("calculator.regime.summaryLabel")}
                  </span>
                  {taxType === "IVA" &&
                    t("calculator.regime.summaryIVA")}
                  {taxType === "ReteFuente" &&
                    t("calculator.regime.summaryReteFuente")}
                  {taxType === "ICA" &&
                    t("calculator.regime.summaryICA", {
                      city: icaRates[city].label,
                      rate: icaRates[city].perThousand,
                    })}
                </div>
              </div>
            </section>
          )}

          {step === 4 && result && (
            <section
              aria-labelledby="step-4-title"
              aria-live="polite"
              className="space-y-5"
            >
              <div className="flex items-center gap-2">
                <CircleDollarSign
                  className="h-5 w-5 text-primary"
                  aria-hidden={true}
                />
                <h2 id="step-4-title" className="text-lg font-semibold">
                  {t("calculator.steps.results.label")}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {t("calculator.results.estimated")}{" "}
                  {t("calculator.results.generated", {
                    date: fmtDate(
                      new Date(result.generatedAt),
                      locale,
                      { dateStyle: "medium", timeStyle: "short" }
                    ),
                  })}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ResultCard
                  icon={Coins}
                  label={t("calculator.results.baseLabel")}
                  value={formatCOP(result.base, locale)}
                  tooltip={t("calculator.results.baseTooltip")}
                  variant="muted"
                />

                {result.taxType === "IVA" && (
                  <>
                    <ResultCard
                      icon={Percent}
                      label={t("calculator.results.ivaRateLabel")}
                      value={result.rateLabel}
                      tooltip={t("calculator.results.ivaRateTooltip")}
                      variant="muted"
                    />
                    <ResultCard
                      icon={Receipt}
                      label={t("report.ivaGenerated")}
                      value={formatCOP(result.tax, locale)}
                      tooltip={t("calculator.results.ivaGeneratedTooltip")}
                      variant="muted"
                    />
                    <ResultCard
                      icon={Receipt}
                      label={t("report.ivaDeductible")}
                      value={formatCOP(result.deductions * result.rate, locale)}
                      tooltip={t("calculator.results.ivaDeductibleTooltip")}
                      variant="muted"
                    />
                    <ResultCard
                      icon={CircleDollarSign}
                      label={t("rows.ivaNet")}
                      value={formatCOP(result.netPayable ?? 0, locale)}
                      tooltip={t("calculator.results.ivaNetTooltip")}
                      variant="highlight"
                    />
                    <ResultCard
                      icon={Wallet}
                      label={t("calculator.results.totalWithIvaLabel")}
                      value={formatCOP(result.total, locale)}
                      tooltip={t("calculator.results.totalWithIvaTooltip")}
                      variant="muted"
                    />
                  </>
                )}

                {result.taxType === "ReteFuente" && (
                  <>
                    <ResultCard
                      icon={Percent}
                      label={t("calculator.results.retentionRateLabel")}
                      value={result.rateLabel}
                      tooltip={t("calculator.results.retentionRateTooltip")}
                      variant="muted"
                    />
                    <ResultCard
                      icon={CircleDollarSign}
                      label={t("calculator.results.retentionLabel")}
                      value={formatCOP(result.tax, locale)}
                      tooltip={t("calculator.results.retentionTooltip")}
                      variant="highlight"
                    />
                    <ResultCard
                      icon={Wallet}
                      label={t("calculator.results.totalReceiveLabel")}
                      value={formatCOP(result.total, locale)}
                      tooltip={t("calculator.results.totalReceiveTooltip")}
                      variant="muted"
                    />
                  </>
                )}

                {result.taxType === "ICA" && (
                  <>
                    <ResultCard
                      icon={Percent}
                      label={t("calculator.results.icaRateLabel")}
                      value={result.rateLabel}
                      tooltip={t("calculator.results.icaRateTooltip")}
                      variant="muted"
                    />
                    <ResultCard
                      icon={CircleDollarSign}
                      label={t("report.ica")}
                      value={formatCOP(result.tax, locale)}
                      tooltip={t("calculator.results.icaEstimatedTooltip")}
                      variant="highlight"
                    />
                    <ResultCard
                      icon={Wallet}
                      label={t("calculator.results.icaTotalLabel")}
                      value={formatCOP(result.total, locale)}
                      tooltip={t("calculator.results.icaTotalTooltip")}
                      variant="muted"
                    />
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPdf}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" aria-hidden={true} />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" aria-hidden={true} />
                  Excel
                </Button>
              </div>

              <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                <div className="flex items-start gap-2">
                  <Info
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden={true}
                  />
                  <p>{t("calculator.disclaimer")}</p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden={true} />
            {t("calculator.nav.previous")}
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => {
                if (step === 3) {
                  goToResults();
                } else {
                  setStep((s) => s + 1);
                }
              }}
              className="gap-2"
            >
              {step === 3
                ? t("calculator.nav.calculate")
                : t("calculator.nav.next")}
              {step === 3 ? (
                <Calculator className="h-4 w-4" aria-hidden={true} />
              ) : (
                <ArrowRight className="h-4 w-4" aria-hidden={true} />
              )}
            </Button>
          ) : (
            <Button onClick={reset} variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4" aria-hidden={true} />
              {t("calculator.nav.newCalculation")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TooltipInfo({ children }: { children: React.ReactNode }) {
  const t = useTranslations("dashboard.tax");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={t("calculator.tooltipInfoAria")}
          className="shrink-0"
        >
          <Info className="h-4 w-4" aria-hidden={true} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[16rem]">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

interface ResultCardProps {
  icon: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean;
  }>;
  label: string;
  value: string;
  tooltip: string;
  variant?: "muted" | "highlight";
}

function ResultCard({
  icon: Icon,
  label,
  value,
  tooltip,
  variant = "muted",
}: ResultCardProps) {
  const t = useTranslations("dashboard.tax");
  return (
    <div
      className={cn(
        "relative rounded-xl border p-4",
        variant === "highlight"
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-background"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "h-4 w-4",
              variant === "highlight"
                ? "text-primary"
                : "text-muted-foreground"
            )}
            aria-hidden={true}
          />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t("calculator.resultCardInfoAria", { label })}
              className="shrink-0"
            >
              <Info className="h-3.5 w-3.5" aria-hidden={true} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[14rem]">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </div>
      <div
        className={cn(
          "mt-2 text-xl font-bold tracking-tight sm:text-2xl",
          variant === "highlight" && "text-primary"
        )}
      >
        {value}
      </div>
    </div>
  );
}

async function exportCalculationPdf(
  result: CalculationResult,
  t: TFn,
  locale: Locale
) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const { height } = page.getSize();
  const margin = 50;
  let y = height - margin;
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  function drawText(
    text: string,
    opts: {
      x?: number;
      y?: number;
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
    }
  ) {
    const size = opts.size ?? 10;
    const f = opts.bold ? fontBold : font;
    page.drawText(text, {
      x: opts.x ?? margin,
      y: opts.y ?? y,
      size,
      font: f,
      color: opts.color ?? rgb(0.2, 0.2, 0.2),
    });
  }

  drawText(t("calculator.pdf.title"), {
    size: 16,
    bold: true,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 24;
  drawText(
    t("calculator.pdf.generated", {
      date: fmtDate(new Date(result.generatedAt), locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    }),
    {
      size: 9,
      color: rgb(0.4, 0.4, 0.4),
    }
  );
  y -= 28;

  const lines: [string, string][] = [
    [t("calculator.regime.taxTypeLabel"), result.taxType],
    [t("calculator.results.baseLabel"), formatCOP(result.base, locale)],
    [t("calculator.pdf.rows.rate"), result.rateLabel],
    [t("calculator.pdf.rows.estimatedTax"), formatCOP(result.tax, locale)],
    [t("exampleColumns.total"), formatCOP(result.total, locale)],
  ];

  if (result.taxType === "IVA" && result.netPayable !== undefined) {
    lines.push([t("rows.ivaNet"), formatCOP(result.netPayable, locale)]);
  }
  if (result.city) {
    lines.push([
      t("calculator.pdf.rows.icaCity"),
      icaRates[result.city]?.label ?? result.city,
    ]);
  }

  for (const [label, value] of lines) {
    drawText(label, { y, size: 10 });
    drawText(value, { x: margin + 240, y, size: 10, bold: true });
    y -= 16;
  }

  y -= 16;
  drawText(t("calculator.pdf.disclaimerHeading"), { y, size: 12, bold: true });
  y -= 16;
  const disclaimer = t("calculator.pdf.disclaimerBody");
  for (const line of wrapText(disclaimer, 75)) {
    drawText(line, { y, size: 9, color: rgb(0.4, 0.4, 0.4) });
    y -= 12;
  }

  const bytes = new Uint8Array(await doc.save());
  downloadBlob(
    new Blob([bytes], { type: "application/pdf" }),
    "calculo-impuestos.pdf"
  );
}

async function exportCalculationExcel(
  result: CalculationResult,
  t: TFn,
  locale: Locale
) {
  const XLSX = await import("xlsx");
  const rows = [
    { Concepto: t("calculator.regime.taxTypeLabel"), Valor: result.taxType },
    {
      Concepto: t("calculator.results.baseLabel"),
      Valor: formatCOP(result.base, locale),
    },
    { Concepto: t("calculator.pdf.rows.rate"), Valor: result.rateLabel },
    {
      Concepto: t("calculator.pdf.rows.estimatedTax"),
      Valor: formatCOP(result.tax, locale),
    },
    {
      Concepto: t("exampleColumns.total"),
      Valor: formatCOP(result.total, locale),
    },
    ...(result.netPayable !== undefined
      ? [
          {
            Concepto: t("rows.ivaNet"),
            Valor: formatCOP(result.netPayable, locale),
          },
        ]
      : []),
    ...(result.city
      ? [
          {
            Concepto: t("calculator.pdf.rows.icaCity"),
            Valor: icaRates[result.city]?.label ?? result.city,
          },
        ]
      : []),
    {
      Concepto: t("calculator.excel.generated"),
      Valor: fmtDate(new Date(result.generatedAt), locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    },
    {
      Concepto: t("calculator.pdf.disclaimerHeading"),
      Valor: t("calculator.excel.disclaimerBody"),
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, t("calculator.excel.sheetName"));
  const buffer = new Uint8Array(XLSX.write(workbook, { type: "array", bookType: "xlsx" }));
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "calculo-impuestos.xlsx"
  );
}

function wrapText(text: string, maxLength: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxLength) {
      lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}