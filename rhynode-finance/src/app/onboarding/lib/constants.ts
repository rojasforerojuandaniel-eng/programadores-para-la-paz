"use client";

import { z } from "zod";
import type { UserScope } from "@/lib/scope";

export type TranslationFn = (key: string) => string;

export const ONBOARDING_STEPS = [
  { id: "data", labelKey: "stepLabels.data" as const },
  { id: "goals", labelKey: "stepLabels.goals" as const },
  { id: "done", labelKey: "stepLabels.done" as const },
] as const;

export const SCOPE_OPTIONS: readonly UserScope[] = ["PERSONAL", "BUSINESS", "BOTH"];

export const COUNTRY_VALUES = [
  "CO",
  "MX",
  "BR",
  "AR",
  "CL",
  "PE",
] as const;

export type CountryValue = (typeof COUNTRY_VALUES)[number];

export const CURRENCIES = [
  { value: "COP", label: "COP" },
  { value: "MXN", label: "MXN" },
  { value: "BRL", label: "BRL" },
  { value: "ARS", label: "ARS" },
  { value: "CLP", label: "CLP" },
  { value: "PEN", label: "PEN" },
  { value: "USD", label: "USD" },
] as const;

export type CurrencyValue = (typeof CURRENCIES)[number]["value"];

export const TIMEZONE_VALUES = [
  "America/Bogota",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "America/Lima",
] as const;

export type TimezoneValue = (typeof TIMEZONE_VALUES)[number];

export const COUNTRY_LABEL_KEYS: Record<CountryValue, string> = {
  CO: "countries.CO",
  MX: "countries.MX",
  BR: "countries.BR",
  AR: "countries.AR",
  CL: "countries.CL",
  PE: "countries.PE",
};

export const TIMEZONE_LABEL_KEYS: Record<TimezoneValue, string> = {
  "America/Bogota": "timezones.America/Bogota",
  "America/Mexico_City": "timezones.America/Mexico_City",
  "America/Sao_Paulo": "timezones.America/Sao_Paulo",
  "America/Argentina/Buenos_Aires": "timezones.America/Argentina/Buenos_Aires",
  "America/Santiago": "timezones.America/Santiago",
  "America/Lima": "timezones.America/Lima",
};

export const LOCALE_MAP: Record<
  CountryValue,
  { country: CountryValue; currency: CurrencyValue; timezone: TimezoneValue }
> = {
  CO: { country: "CO", currency: "COP", timezone: "America/Bogota" },
  MX: { country: "MX", currency: "MXN", timezone: "America/Mexico_City" },
  BR: { country: "BR", currency: "BRL", timezone: "America/Sao_Paulo" },
  AR: { country: "AR", currency: "ARS", timezone: "America/Argentina/Buenos_Aires" },
  CL: { country: "CL", currency: "CLP", timezone: "America/Santiago" },
  PE: { country: "PE", currency: "PEN", timezone: "America/Lima" },
};

export function detectLocale() {
  const lang = typeof navigator !== "undefined" ? navigator.language : "es-CO";
  const region = lang.split("-")[1]?.toUpperCase() || "CO";
  return LOCALE_MAP[region as CountryValue] || LOCALE_MAP.CO;
}

export function countryLabel(value: string, t: TranslationFn): string {
  const key = COUNTRY_LABEL_KEYS[value as CountryValue];
  return key ? t(key) : value;
}

export function timezoneLabel(value: string, t: TranslationFn): string {
  const key = TIMEZONE_LABEL_KEYS[value as TimezoneValue];
  return key ? t(key) : value;
}

export function buildStep1Schema(t: TranslationFn) {
  return z
    .object({
      mode: z.enum(["PERSONAL", "BUSINESS", "BOTH"], {
        message: t("errors.requiredMode"),
      }),
      personalName: z.string(),
      businessName: z.string(),
      taxId: z.string(),
      country: z.enum(["CO", "MX", "BR", "AR", "CL", "PE"], {
        message: t("errors.requiredCountry"),
      }),
      currency: z.enum(["COP", "MXN", "BRL", "ARS", "CLP", "PEN", "USD"], {
        message: t("errors.requiredCurrency"),
      }),
      timezone: z.string().min(1, t("errors.requiredTimezone")),
    })
    .superRefine((data, ctx) => {
      if (data.mode === "PERSONAL" || data.mode === "BOTH") {
        if (!data.personalName.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            type: "string",
            origin: "string",
            minimum: 1,
            inclusive: true,
            message: t("errors.requiredName"),
            path: ["personalName"],
          });
        }
      }
      if (data.mode === "BUSINESS" || data.mode === "BOTH") {
        if (!data.businessName.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.too_small,
            type: "string",
            origin: "string",
            minimum: 1,
            inclusive: true,
            message: t("errors.requiredBusinessName"),
            path: ["businessName"],
          });
        }
      }
    });
}

export function buildGoalSchema(t: TranslationFn) {
  return z.object({
    name: z.string().min(1, t("errors.requiredGoalName")),
    targetAmount: z.number().min(1, t("errors.goalAmountMin")),
    currency: z.string().min(1, t("errors.requiredCurrency")),
  });
}

export interface OnboardingFormState {
  personalName: string;
  businessName: string;
  taxId: string;
  country: CountryValue;
  currency: CurrencyValue;
  timezone: TimezoneValue;
}

export interface OnboardingGoalState {
  name: string;
  targetAmount: string;
}
