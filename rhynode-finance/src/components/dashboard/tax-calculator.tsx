"use client";

import { useMemo, useState } from "react";
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

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
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
  { id: 1, label: "Ingresos", description: "Monto base gravable" },
  { id: 2, label: "Deducciones", description: "Descuentos aplicables" },
  { id: 3, label: "Régimen", description: "Tipo de impuesto" },
  { id: 4, label: "Resultados", description: "Cálculo estimado" },
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
      toast.error("Ingresa un monto base válido mayor a 0");
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
    exportCalculationPdf(result).catch(() => toast.error("Error al generar PDF"));
  }

  function handleExportExcel() {
    if (!result) return;
    exportCalculationExcel(result).catch(() =>
      toast.error("Error al generar Excel")
    );
  }

  const isIva = taxType === "IVA";

  return (
    <Card className="surface-elevated-2">
      <CardHeader>
        <CardTitle className="heading-card flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" aria-hidden={true} />
          Calculadora de Impuestos Colombianos
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stepper */}
        <nav aria-label="Pasos del cálculo">
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
                return (
                  <li key={s.id} className="flex flex-1 flex-col items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (s.id <= step || result) setStep(s.id);
                      }}
                      disabled={s.id > step && !result}
                      aria-current={active ? "step" : undefined}
                      aria-label={`Paso ${s.id}: ${s.label}`}
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
                      {s.label}
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
                  Ingresos
                </h2>
                <TooltipInfo>
                  Ingresa el monto gravable antes de impuestos. Será la base
                  para calcular IVA, ReteFuente o ICA.
                </TooltipInfo>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tax-base">Monto base (COP)</Label>
                  <Badge variant="outline" className="font-mono">
                    {formatCOP(baseNumeric)}
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
                  aria-label="Ajustar monto base"
                  value={[baseNumeric]}
                  max={maxSlider}
                  step={SLIDER_STEP}
                  onValueChange={([value]) => setBaseAmount(String(value ?? 0))}
                />
                <p className="text-xs text-muted-foreground">
                  Desliza o escribe el valor. Máximo sugerido:{" "}
                  {formatCOP(MAX_SLIDER_AMOUNT)}.
                </p>
              </div>
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="step-2-title" className="space-y-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" aria-hidden={true} />
                <h2 id="step-2-title" className="text-lg font-semibold">
                  Deducciones
                </h2>
                <TooltipInfo>
                  Solo aplica para IVA. Ingresa compras o gastos con IVA
                  descontable estimado para calcular el neto a pagar.
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
                    Gastos con IVA descontable (COP)
                  </Label>
                  <Badge variant="outline" className="font-mono">
                    {formatCOP(deductionsNumeric)}
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
                  aria-label="Ajustar deducciones"
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
                  Las deducciones no aplican para ReteFuente o ICA. Se omiten
                  del cálculo.
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
                  Régimen
                </h2>
                <TooltipInfo>
                  Selecciona el impuesto. ICA usa la tarifa por mil del municipio.
                </TooltipInfo>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tax-type">Tipo de impuesto</Label>
                  <Select
                    value={taxType}
                    onValueChange={(value) => setTaxType(value as TaxType)}
                  >
                    <SelectTrigger id="tax-type">
                      <SelectValue placeholder="Selecciona un impuesto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IVA">IVA (19%)</SelectItem>
                      <SelectItem value="ReteFuente">
                        ReteFuente (0%–4%)
                      </SelectItem>
                      <SelectItem value="ICA">ICA (por ciudad)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {taxType === "ICA" && (
                  <div className="space-y-2">
                    <Label htmlFor="tax-city">Ciudad</Label>
                    <Select value={city} onValueChange={setCity}>
                      <SelectTrigger id="tax-city">
                        <SelectValue placeholder="Selecciona una ciudad" />
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
                  <span className="font-medium text-foreground">Resumen: </span>
                  {taxType === "IVA" &&
                    "El IVA se calcula sobre el monto base y se descuenta el IVA estimado de tus gastos."}
                  {taxType === "ReteFuente" &&
                    "La tarifa varía según el monto base: 0%, 1%, 2%, 3% o 4%."}
                  {taxType === "ICA" &&
                    `Tarifa aproximada para ${icaRates[city].label}: ${icaRates[city].perThousand}‰.`}
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
                  Resultados
                </h2>
                <span className="text-xs text-muted-foreground">
                  Cálculo estimado ·{" "}
                  {new Date(result.generatedAt).toLocaleString("es-CO")}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ResultCard
                  icon={Coins}
                  label="Base gravable"
                  value={formatCOP(result.base)}
                  tooltip="Monto sobre el que se aplica la tarifa."
                  variant="muted"
                />

                {result.taxType === "IVA" && (
                  <>
                    <ResultCard
                      icon={Percent}
                      label="Tasa IVA"
                      value={result.rateLabel}
                      tooltip="Tarifa general del IVA en Colombia."
                      variant="muted"
                    />
                    <ResultCard
                      icon={Receipt}
                      label="IVA generado"
                      value={formatCOP(result.tax)}
                      tooltip="Impuesto que cargarías a tu cliente."
                      variant="muted"
                    />
                    <ResultCard
                      icon={Receipt}
                      label="IVA descontable estimado"
                      value={formatCOP(result.deductions * result.rate)}
                      tooltip="IVA estimado de tus gastos descontables."
                      variant="muted"
                    />
                    <ResultCard
                      icon={CircleDollarSign}
                      label="IVA neto a pagar"
                      value={formatCOP(result.netPayable ?? 0)}
                      tooltip="IVA generado menos el descontable estimado."
                      variant="highlight"
                    />
                    <ResultCard
                      icon={Wallet}
                      label="Total con IVA"
                      value={formatCOP(result.total)}
                      tooltip="Monto base más el IVA generado."
                      variant="muted"
                    />
                  </>
                )}

                {result.taxType === "ReteFuente" && (
                  <>
                    <ResultCard
                      icon={Percent}
                      label="Tarifa de retención"
                      value={result.rateLabel}
                      tooltip="Tarifa según el monto base (umbral simplificado)."
                      variant="muted"
                    />
                    <ResultCard
                      icon={CircleDollarSign}
                      label="Retención estimada"
                      value={formatCOP(result.tax)}
                      tooltip="Monto que se retendría sobre el ingreso."
                      variant="highlight"
                    />
                    <ResultCard
                      icon={Wallet}
                      label="Total a recibir"
                      value={formatCOP(result.total)}
                      tooltip="Ingreso menos la retención practicada."
                      variant="muted"
                    />
                  </>
                )}

                {result.taxType === "ICA" && (
                  <>
                    <ResultCard
                      icon={Percent}
                      label="Tarifa ICA"
                      value={result.rateLabel}
                      tooltip="Tarifa por mil del municipio seleccionado."
                      variant="muted"
                    />
                    <ResultCard
                      icon={CircleDollarSign}
                      label="ICA estimado"
                      value={formatCOP(result.tax)}
                      tooltip="Impuesto de industria y comercio estimado."
                      variant="highlight"
                    />
                    <ResultCard
                      icon={Wallet}
                      label="Total gravado"
                      value={formatCOP(result.total)}
                      tooltip="Base más el ICA estimado."
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
                  <p>
                    Estos valores son orientativos. Consulta con un contador o
                    revisor fiscal antes de presentar declaraciones ante la DIAN
                    o municipios.
                  </p>
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
            Anterior
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
              {step === 3 ? "Calcular" : "Siguiente"}
              {step === 3 ? (
                <Calculator className="h-4 w-4" aria-hidden={true} />
              ) : (
                <ArrowRight className="h-4 w-4" aria-hidden={true} />
              )}
            </Button>
          ) : (
            <Button onClick={reset} variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4" aria-hidden={true} />
              Nuevo cálculo
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TooltipInfo({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Más información"
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
              aria-label={`Información sobre ${label}`}
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

async function exportCalculationPdf(result: CalculationResult) {
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

  drawText("Resumen de cálculo de impuestos - Rhynode Finance", {
    size: 16,
    bold: true,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 24;
  drawText(`Generado: ${new Date(result.generatedAt).toLocaleString("es-CO")}`, {
    size: 9,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 28;

  const lines: [string, string][] = [
    ["Tipo de impuesto", result.taxType],
    ["Base gravable", formatCOP(result.base)],
    ["Tarifa", result.rateLabel],
    ["Impuesto estimado", formatCOP(result.tax)],
    ["Total", formatCOP(result.total)],
  ];

  if (result.taxType === "IVA" && result.netPayable !== undefined) {
    lines.push(["IVA neto a pagar", formatCOP(result.netPayable)]);
  }
  if (result.city) {
    lines.push(["Ciudad ICA", icaRates[result.city]?.label ?? result.city]);
  }

  for (const [label, value] of lines) {
    drawText(label, { y, size: 10 });
    drawText(value, { x: margin + 240, y, size: 10, bold: true });
    y -= 16;
  }

  y -= 16;
  drawText("Descargo", { y, size: 12, bold: true });
  y -= 16;
  const disclaimer =
    "Estos valores son orientativos. Consulta con un contador o revisor fiscal antes de presentar declaraciones.";
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

async function exportCalculationExcel(result: CalculationResult) {
  const XLSX = await import("xlsx");
  const rows = [
    { Concepto: "Tipo de impuesto", Valor: result.taxType },
    { Concepto: "Base gravable", Valor: formatCOP(result.base) },
    { Concepto: "Tarifa", Valor: result.rateLabel },
    { Concepto: "Impuesto estimado", Valor: formatCOP(result.tax) },
    { Concepto: "Total", Valor: formatCOP(result.total) },
    ...(result.netPayable !== undefined
      ? [{ Concepto: "IVA neto a pagar", Valor: formatCOP(result.netPayable) }]
      : []),
    ...(result.city
      ? [
          {
            Concepto: "Ciudad ICA",
            Valor: icaRates[result.city]?.label ?? result.city,
          },
        ]
      : []),
    {
      Concepto: "Generado",
      Valor: new Date(result.generatedAt).toLocaleString("es-CO"),
    },
    {
      Concepto: "Descargo",
      Valor:
        "Estos valores son orientativos. Consulta con un contador antes de declarar.",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Cálculo");
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
