"use client";

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
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/locale";
import {
  type IcaCityKey,
  type TFn,
  type TaxType,
  formatCOP,
  getIcaCityLabel,
  icaRates,
  MAX_SLIDER_AMOUNT,
  SLIDER_STEP,
} from "@/lib/tax-calculator";
import { useTranslations } from "next-intl";
import { Wallet, Receipt, Landmark, Info } from "lucide-react";

interface TaxCalculatorFormProps {
  step: number;
  taxType: TaxType;
  baseAmount: string;
  deductions: string;
  city: IcaCityKey;
  baseNumeric: number;
  deductionsNumeric: number;
  maxSlider: number;
  locale: Locale;
  t: TFn;
  onBaseAmountChange: (value: string) => void;
  onDeductionsChange: (value: string) => void;
  onTaxTypeChange: (value: TaxType) => void;
  onCityChange: (value: IcaCityKey) => void;
}

export function TaxCalculatorForm({
  step,
  taxType,
  baseAmount,
  deductions,
  city,
  baseNumeric,
  deductionsNumeric,
  maxSlider,
  locale,
  t,
  onBaseAmountChange,
  onDeductionsChange,
  onTaxTypeChange,
  onCityChange,
}: TaxCalculatorFormProps) {
  const isIva = taxType === "IVA";

  return (
    <div className="min-h-[12rem]">
      {step === 1 && (
        <section aria-labelledby="step-1-title" className="space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" aria-hidden={true} />
            <h2 id="step-1-title" className="text-lg font-semibold">
              {t("calculator.steps.income.label")}
            </h2>
            <TooltipInfo>{t("calculator.income.tooltip")}</TooltipInfo>
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
              onChange={(e) => onBaseAmountChange(e.target.value)}
              placeholder="1,000,000"
              className="text-base"
            />
            <Slider
              id="tax-base-slider"
              aria-label={t("calculator.income.sliderAria")}
              value={[baseNumeric]}
              max={maxSlider}
              step={SLIDER_STEP}
              onValueChange={([value]) =>
                onBaseAmountChange(String(value ?? 0))
              }
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
            <TooltipInfo>{t("calculator.deductions.tooltip")}</TooltipInfo>
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
              onChange={(e) => onDeductionsChange(e.target.value)}
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
                onDeductionsChange(String(value ?? 0))
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
            <Landmark className="h-5 w-5 text-primary" aria-hidden={true} />
            <h2 id="step-3-title" className="text-lg font-semibold">
              {t("calculator.steps.regime.label")}
            </h2>
            <TooltipInfo>{t("calculator.regime.tooltip")}</TooltipInfo>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax-type">
                {t("calculator.regime.taxTypeLabel")}
              </Label>
              <Select
                value={taxType}
                onValueChange={(value) =>
                  onTaxTypeChange(value as TaxType)
                }
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
                <Select
                  value={city}
                  onValueChange={(value) =>
                    onCityChange(value as IcaCityKey)
                  }
                >
                  <SelectTrigger id="tax-city">
                    <SelectValue
                      placeholder={t("calculator.regime.cityPlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(icaRates).map(([key, { perThousand }]) => (
                      <SelectItem key={key} value={key}>
                        {getIcaCityLabel(key, t)} ({perThousand}‰)
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
              {taxType === "IVA" && t("calculator.regime.summaryIVA")}
              {taxType === "ReteFuente" &&
                t("calculator.regime.summaryReteFuente")}
              {taxType === "ICA" &&
                t("calculator.regime.summaryICA", {
                  city: getIcaCityLabel(city, t),
                  rate: icaRates[city].perThousand,
                })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export function TooltipInfo({ children }: { children: React.ReactNode }) {
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
