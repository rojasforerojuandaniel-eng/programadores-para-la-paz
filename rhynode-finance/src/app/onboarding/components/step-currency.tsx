"use client";

import { useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldErrors } from "../hooks/use-onboarding";
import {
  COUNTRY_VALUES,
  CURRENCIES,
  TIMEZONE_VALUES,
  countryLabel,
  timezoneLabel,
  type CurrencyValue,
  type TimezoneValue,
  type OnboardingFormState,
} from "../lib/constants";

interface StepCurrencyProps {
  form: OnboardingFormState;
  errors: FieldErrors;
  onUpdateField: <K extends keyof OnboardingFormState>(key: K, value: OnboardingFormState[K]) => void;
  onUpdateCountry: (value: string) => void;
}

function fieldError(errors: FieldErrors, key: string) {
  return errors[key]?.[0];
}

export default function StepCurrency({
  form,
  errors,
  onUpdateField,
  onUpdateCountry,
}: StepCurrencyProps) {
  const t = useTranslations("onboarding.flow");

  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-4 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Globe className="h-4 w-4 text-primary" aria-hidden="true" />
          {t("location.title")}
        </h2>
        <div className="space-y-2">
          <Label htmlFor="country">
            {t("location.countryLabel")}{" "}
            <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Select value={form.country} onValueChange={onUpdateCountry}>
            <SelectTrigger
              id="country"
              aria-required="true"
              aria-invalid={errors.country ? true : undefined}
              aria-describedby={errors.country ? "country-error" : undefined}
              className="h-12"
            >
              <SelectValue placeholder={t("location.countryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_VALUES.map((c) => (
                <SelectItem key={c} value={c}>
                  {countryLabel(c, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.country && (
            <p
              id="country-error"
              className="text-sm font-medium text-destructive"
              role="alert"
            >
              {fieldError(errors, "country")}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="currency">
              {t("location.currencyLabel")}{" "}
              <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Select
              value={form.currency}
              onValueChange={(v) => onUpdateField("currency", v as CurrencyValue)}
            >
              <SelectTrigger
                id="currency"
                aria-required="true"
                aria-invalid={errors.currency ? true : undefined}
                aria-describedby={errors.currency ? "currency-error" : undefined}
                className="h-12"
              >
                <SelectValue placeholder={t("location.currencyPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.currency && (
              <p
                id="currency-error"
                className="text-sm font-medium text-destructive"
                role="alert"
              >
                {fieldError(errors, "currency")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">
              {t("location.timezoneLabel")}{" "}
              <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Select
              value={form.timezone}
              onValueChange={(v) => onUpdateField("timezone", v as TimezoneValue)}
            >
              <SelectTrigger
                id="timezone"
                aria-required="true"
                aria-invalid={errors.timezone ? true : undefined}
                aria-describedby={errors.timezone ? "timezone-error" : undefined}
                className="h-12"
              >
                <SelectValue placeholder={t("location.timezonePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_VALUES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {timezoneLabel(tz, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.timezone && (
              <p
                id="timezone-error"
                className="text-sm font-medium text-destructive"
                role="alert"
              >
                {fieldError(errors, "timezone")}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
