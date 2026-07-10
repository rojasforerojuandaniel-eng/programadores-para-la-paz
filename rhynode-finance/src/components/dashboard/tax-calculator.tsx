"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/locale";
import { Calculator, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import {
  type CalculationResult,
  type IcaCityKey,
  type TaxType,
  calculate,
  clampAmount,
  MAX_SLIDER_AMOUNT,
} from "@/lib/tax-calculator";
import { TaxStepper } from "@/components/tax/tax-stepper";
import { TaxCalculatorForm } from "@/components/tax/tax-calculator-form";
import { TaxResultCards } from "@/components/tax/tax-result-cards";

export function TaxCalculator() {
  const t = useTranslations("dashboard.tax");
  const locale = useLocale() as Locale;
  const [step, setStep] = useState(1);
  const [taxType, setTaxType] = useState<TaxType>("IVA");
  const [baseAmount, setBaseAmount] = useState("");
  const [deductions, setDeductions] = useState("");
  const [city, setCity] = useState<IcaCityKey>("bogota");
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
    setResult(
      calculate(
        baseNumeric,
        deductionsNumeric,
        taxType,
        taxType === "ICA" ? city : undefined
      )
    );
    setStep(4);
  }

  return (
    <Card className="surface-elevated-2">
      <CardHeader>
        <CardTitle className="heading-card flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" aria-hidden={true} />
          {t("calculator.cardTitle")}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <TaxStepper step={step} result={result} t={t} onStepClick={setStep} />

        {step === 4 && result ? (
          <TaxResultCards result={result} locale={locale} t={t} />
        ) : (
          <TaxCalculatorForm
            step={step}
            taxType={taxType}
            baseAmount={baseAmount}
            deductions={deductions}
            city={city}
            baseNumeric={baseNumeric}
            deductionsNumeric={deductionsNumeric}
            maxSlider={maxSlider}
            locale={locale}
            t={t}
            onBaseAmountChange={setBaseAmount}
            onDeductionsChange={setDeductions}
            onTaxTypeChange={setTaxType}
            onCityChange={setCity}
          />
        )}

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
                if (step === 3) goToResults();
                else setStep((s) => s + 1);
              }}
              className="gap-2"
            >
              {step === 3 ? t("calculator.nav.calculate") : t("calculator.nav.next")}
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
