"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Building2,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  Target,
  Globe,
  Coins,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { UserScope } from "@/lib/scope";
import { canAccessPersonal } from "@/lib/scope";
import { trackEvent } from "@/lib/analytics";
import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/lib/locale";
import { z } from "zod";

type TranslationFn = ReturnType<typeof useTranslations>;

const COUNTRY_VALUES = [
  "CO",
  "MX",
  "BR",
  "AR",
  "CL",
  "PE",
] as const;
type CountryValue = (typeof COUNTRY_VALUES)[number];

const CURRENCY_OPTIONS = [
  { value: "COP", label: "COP" },
  { value: "MXN", label: "MXN" },
  { value: "BRL", label: "BRL" },
  { value: "ARS", label: "ARS" },
  { value: "CLP", label: "CLP" },
  { value: "PEN", label: "PEN" },
  { value: "USD", label: "USD" },
] as const;

const TIMEZONE_VALUES = [
  "America/Bogota",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "America/Lima",
] as const;
type TimezoneValue = (typeof TIMEZONE_VALUES)[number];

const COUNTRY_LABEL_KEYS: Record<CountryValue, string> = {
  CO: "countries.CO",
  MX: "countries.MX",
  BR: "countries.BR",
  AR: "countries.AR",
  CL: "countries.CL",
  PE: "countries.PE",
};

const TIMEZONE_LABEL_KEYS: Record<TimezoneValue, string> = {
  "America/Bogota": "timezones.America/Bogota",
  "America/Mexico_City": "timezones.America/Mexico_City",
  "America/Sao_Paulo": "timezones.America/Sao_Paulo",
  "America/Argentina/Buenos_Aires": "timezones.America/Argentina/Buenos_Aires",
  "America/Santiago": "timezones.America/Santiago",
  "America/Lima": "timezones.America/Lima",
};

function countryLabel(value: string, t: TranslationFn): string {
  const key = COUNTRY_LABEL_KEYS[value as CountryValue];
  return key ? t(key) : value;
}

function timezoneLabel(value: string, t: TranslationFn): string {
  const key = TIMEZONE_LABEL_KEYS[value as TimezoneValue];
  return key ? t(key) : value;
}

const LOCALE_MAP: Record<
  string,
  { country: string; currency: string; timezone: string }
> = {
  CO: { country: "CO", currency: "COP", timezone: "America/Bogota" },
  MX: { country: "MX", currency: "MXN", timezone: "America/Mexico_City" },
  BR: { country: "BR", currency: "BRL", timezone: "America/Sao_Paulo" },
  AR: {
    country: "AR",
    currency: "ARS",
    timezone: "America/Argentina/Buenos_Aires",
  },
  CL: { country: "CL", currency: "CLP", timezone: "America/Santiago" },
  PE: { country: "PE", currency: "PEN", timezone: "America/Lima" },
  US: { country: "US", currency: "USD", timezone: "America/New_York" },
};

type ModeId = UserScope;

const MODE_IDS: ModeId[] = ["PERSONAL", "BUSINESS", "BOTH"];

const MODE_ICONS: Record<ModeId, typeof User> = {
  PERSONAL: User,
  BUSINESS: Building2,
  BOTH: Briefcase,
};

const MODE_LABEL_KEYS: Record<ModeId, string> = {
  PERSONAL: "modes.PERSONAL.label",
  BUSINESS: "modes.BUSINESS.label",
  BOTH: "modes.BOTH.label",
};

const MODE_DESC_KEYS: Record<ModeId, string> = {
  PERSONAL: "modes.PERSONAL.description",
  BUSINESS: "modes.BUSINESS.description",
  BOTH: "modes.BOTH.description",
};

interface ModeOption {
  id: ModeId;
  label: string;
  description: string;
  icon: typeof User;
}

function buildModes(t: TranslationFn): ModeOption[] {
  return MODE_IDS.map((id) => ({
    id,
    label: t(MODE_LABEL_KEYS[id]),
    description: t(MODE_DESC_KEYS[id]),
    icon: MODE_ICONS[id],
  }));
}

function detectLocale() {
  const lang =
    typeof navigator !== "undefined" ? navigator.language : "es-CO";
  const region = lang.split("-")[1]?.toUpperCase() || "CO";
  return LOCALE_MAP[region] || LOCALE_MAP.CO;
}

function buildStep1Schema(t: TranslationFn) {
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

function buildGoalSchema(t: TranslationFn) {
  return z.object({
    name: z.string().min(1, t("errors.requiredGoalName")),
    targetAmount: z.number().min(1, t("errors.goalAmountMin")),
    currency: z.string().min(1, t("errors.requiredCurrency")),
  });
}

function fieldError(
  errors: Record<string, string[] | undefined>,
  key: string,
) {
  return errors[key]?.[0];
}

function StepPanel({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out motion-reduce:transition-none",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-3 opacity-0",
      )}
    >
      {children}
    </div>
  );
}

const STEP_LABEL_KEYS = ["stepLabels.data", "stepLabels.goals", "stepLabels.done"] as const;

export default function OnboardingFlow() {
  const router = useRouter();
  const t = useTranslations("onboarding.flow");
  const locale = useLocale() as Locale;
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<UserScope | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const [form, setForm] = useState(() => {
    const detected = detectLocale();
    return {
      personalName: "",
      businessName: "",
      taxId: "",
      country: detected.country,
      currency: detected.currency,
      timezone: detected.timezone,
    };
  });

  const [goal, setGoal] = useState<{
    name: string;
    targetAmount: string;
  } | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const modeGroupRef = useRef<HTMLDivElement>(null);

  const modes = buildModes(t);
  const step1Schema = buildStep1Schema(t);
  const goalSchema = buildGoalSchema(t);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const isBusiness = mode === "BUSINESS" || mode === "BOTH";
  const isPersonal = mode === "PERSONAL" || mode === "BOTH";

  function updateCountry(value: string) {
    const mapped = LOCALE_MAP[value];
    setForm((prev) => ({
      ...prev,
      country: value,
      currency: mapped?.currency ?? prev.currency,
      timezone: mapped?.timezone ?? prev.timezone,
    }));
  }

  function handleSelectMode(selected: UserScope) {
    setMode(selected);
    setErrors((prev) => ({ ...prev, mode: undefined }));
  }

  function focusModeOption(index: number) {
    const buttons = modeGroupRef.current?.querySelectorAll('[role="radio"]');
    const target = buttons?.[index] as HTMLElement | undefined;
    target?.focus();
  }

  function handleModeKeyDown(e: React.KeyboardEvent) {
    const currentIndex = modes.findIndex((m) => m.id === mode);
    let nextIndex = currentIndex;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      nextIndex = currentIndex < modes.length - 1 ? currentIndex + 1 : 0;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      nextIndex = currentIndex > 0 ? currentIndex - 1 : modes.length - 1;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = modes.length - 1;
    } else {
      return;
    }
    const targetMode = modes[nextIndex];
    if (targetMode && targetMode.id !== mode) {
      handleSelectMode(targetMode.id);
    }
    focusModeOption(nextIndex);
  }

  function validateStep1() {
    const parsed = step1Schema.safeParse({ ...form, mode });
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setErrors(flattened as Record<string, string[] | undefined>);
      return flattened;
    }
    setErrors({});
    return null;
  }

  function handleContinueToStep2() {
    const stepErrors = validateStep1();
    if (stepErrors) {
      const firstKey = Object.keys(stepErrors)[0];
      const el = document.getElementById(firstKey ?? "mode");
      el?.focus();
      return;
    }
    setStep(2);
  }

  function validateStep2() {
    if (!goal || (!goal.name.trim() && !goal.targetAmount.trim())) {
      // optional step
      setErrors((prev) => ({ ...prev, goalName: undefined, goalAmount: undefined }));
      return null;
    }
    const parsed = goalSchema.safeParse({
      name: goal.name,
      targetAmount: Number(goal.targetAmount),
      currency: form.currency,
    });
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      const nextErrors = {
        goalName: flattened.name,
        goalAmount: flattened.targetAmount,
      } as Record<string, string[] | undefined>;
      setErrors((prev) => ({ ...prev, ...nextErrors }));
      return nextErrors;
    }
    setErrors((prev) => ({ ...prev, goalName: undefined, goalAmount: undefined }));
    return null;
  }

  function handleContinueToStep3() {
    const stepErrors = validateStep2();
    if (stepErrors) {
      document.getElementById("goal-name")?.focus();
      return;
    }
    setStep(3);
  }

  function handleBack() {
    setStep((prev) => ((prev - 1) as 1 | 2 | 3));
    setErrors({});
  }

  async function handleConfirm() {
    const step1Errors = validateStep1();
    const step2Errors = validateStep2();
    if (step1Errors || step2Errors) {
      toast.error(t("errors.reviewData"));
      return;
    }

    if (!mode) {
      toast.error(t("errors.requiredMode"));
      return;
    }

    setLoading(true);
    try {
      const name = isBusiness ? form.businessName : form.personalName;

      const orgRes = await fetch("/api/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          taxId: isBusiness ? form.taxId || undefined : undefined,
          country: form.country,
          currency: form.currency,
          timezone: form.timezone,
          onboardingCompleted: true,
          scope: mode,
          hasBusiness: isBusiness,
        }),
      });

      if (!orgRes.ok) {
        if (orgRes.status === 401) {
          toast.error(t("errors.sessionExpired"));
          router.push("/sign-in");
          return;
        }
        const data = (await orgRes.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(data.error || t("errors.saveProfile"));
        return;
      }

      let goalCreated = false;
      if (
        goal &&
        goal.name.trim() &&
        goal.targetAmount.trim() &&
        mode &&
        canAccessPersonal(mode)
      ) {
        const goalRes = await fetch("/api/personal/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: goal.name.trim(),
            targetAmount: Number(goal.targetAmount),
            currency: form.currency,
          }),
        });
        if (goalRes.ok) {
          goalCreated = true;
        }
      }

      await fetch("/api/onboarding/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: {
            "complete-profile": true,
            "create-goal": goalCreated,
            "explore-dashboard": true,
          },
          onboardingCompleted: true,
        }),
      });

      trackEvent("onboarding_complete", {
        mode,
        country: form.country,
        currency: form.currency,
        hasBusiness: isBusiness,
        hasPersonal: isPersonal,
        goalCreated,
      });

      toast.success(t("success.redirecting"));
      router.push("/dashboard/personal");
    } catch {
      toast.error(t("errors.network"));
    } finally {
      setLoading(false);
    }
  }

  const stepLabels = STEP_LABEL_KEYS.map((key) => t(key));
  const totalSteps = 3;

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-6 sm:px-6 sm:py-10">
      <main id="main-content" className="flex w-full flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center sm:mb-8">
            <div className="mb-3 inline-flex items-center justify-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Briefcase className="h-4 w-4" aria-hidden="true" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-foreground">
                Rhynode
              </span>
            </div>

            <nav
              aria-label={t("aria.progress")}
              className="mx-auto mt-4 flex max-w-xs items-center"
            >
              <ol className="flex w-full items-center justify-between">
                {[1, 2, 3].map((n, idx) => {
                  const active = step === n;
                  const completed = step > n;
                  const isLast = idx === totalSteps - 1;
                  return (
                    <li key={n} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center gap-2">
                        <span
                          aria-current={active ? "step" : undefined}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                            active
                              ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                              : completed
                                ? "bg-emerald-500/15 text-emerald-500"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {completed ? (
                            <Check
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          ) : (
                            n
                          )}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            active || completed
                              ? "text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {stepLabels[idx]}
                        </span>
                      </div>
                      {!isLast && (
                        <div
                          className={cn(
                            "mx-2 h-px flex-1",
                            step > n ? "bg-primary" : "bg-border",
                          )}
                          aria-hidden="true"
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>

          {step === 1 && (
            <StepPanel>
              <section aria-labelledby="step1-heading" className="space-y-5">
                <div className="text-center">
                  <h1
                    id="step1-heading"
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                  >
                    {t("step1.title")}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    {t("step1.subtitle")}
                  </p>
                </div>

                <div
                  id="mode"
                  ref={modeGroupRef}
                  tabIndex={-1}
                  role="radiogroup"
                  aria-required="true"
                  aria-label={t("aria.modeGroup")}
                  aria-invalid={errors.mode ? true : undefined}
                  aria-describedby={
                    errors.mode ? "mode-error" : undefined
                  }
                  className="space-y-3"
                  onKeyDown={handleModeKeyDown}
                >
                  {modes.map((m, idx) => {
                    const Icon = m.icon;
                    const selected = mode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        tabIndex={
                          selected || (mode === null && idx === 0) ? 0 : -1
                        }
                        onClick={() => handleSelectMode(m.id)}
                        className={cn(
                          "group flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all",
                          "min-h-[72px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:border-primary/40",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors",
                            selected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground group-hover:text-primary",
                          )}
                        >
                          <Icon className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <div className="flex-1">
                          <h2 className="text-base font-semibold text-foreground sm:text-lg">
                            {m.label}
                          </h2>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {m.description}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                            selected
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/30",
                          )}
                          aria-hidden="true"
                        >
                          {selected && (
                            <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {errors.mode && (
                    <p
                      id="mode-error"
                      className="text-sm font-medium text-destructive"
                      role="alert"
                    >
                      {fieldError(errors, "mode")}
                    </p>
                  )}
                </div>

                {isPersonal && (
                  <Card className="border-border bg-card">
                    <CardContent className="space-y-4 p-4">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <User
                          className="h-4 w-4 text-primary"
                          aria-hidden="true"
                        />
                        {t("personalData.title")}
                      </h2>
                      <div className="space-y-2">
                        <Label htmlFor="personal-name">
                          {t("personalData.nameLabel")}{" "}
                          <span className="text-destructive" aria-hidden="true">
                            *
                          </span>
                        </Label>
                        <Input
                          id="personal-name"
                          value={form.personalName}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              personalName: e.target.value,
                            }))
                          }
                          placeholder={t("personalData.namePlaceholder")}
                          aria-required="true"
                          aria-invalid={errors.personalName ? true : undefined}
                          aria-describedby={
                            errors.personalName ? "personal-name-error" : undefined
                          }
                          className="h-12"
                        />
                        {errors.personalName && (
                          <p
                            id="personal-name-error"
                            className="text-sm font-medium text-destructive"
                            role="alert"
                          >
                            {fieldError(errors, "personalName")}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {isBusiness && (
                  <Card className="border-border bg-card">
                    <CardContent className="space-y-4 p-4">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Building2
                          className="h-4 w-4 text-primary"
                          aria-hidden="true"
                        />
                        {t("businessData.title")}
                      </h2>
                      <div className="space-y-2">
                        <Label htmlFor="business-name">
                          {t("businessData.nameLabel")}{" "}
                          <span className="text-destructive" aria-hidden="true">
                            *
                          </span>
                        </Label>
                        <Input
                          id="business-name"
                          value={form.businessName}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              businessName: e.target.value,
                            }))
                          }
                          placeholder={t("businessData.namePlaceholder")}
                          aria-required="true"
                          aria-invalid={errors.businessName ? true : undefined}
                          aria-describedby={
                            errors.businessName
                              ? "business-name-error"
                              : undefined
                          }
                          className="h-12"
                        />
                        {errors.businessName && (
                          <p
                            id="business-name-error"
                            className="text-sm font-medium text-destructive"
                            role="alert"
                          >
                            {fieldError(errors, "businessName")}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tax-id">
                          {t("businessData.taxIdLabel")}{" "}
                          <span className="text-muted-foreground">
                            {t("businessData.taxIdOptional")}
                          </span>
                        </Label>
                        <Input
                          id="tax-id"
                          value={form.taxId}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              taxId: e.target.value,
                            }))
                          }
                          placeholder={t("businessData.taxIdPlaceholder")}
                          className="h-12"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-border bg-card">
                  <CardContent className="space-y-4 p-4">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Globe
                        className="h-4 w-4 text-primary"
                        aria-hidden="true"
                      />
                      {t("location.title")}
                    </h2>
                    <div className="space-y-2">
                      <Label htmlFor="country">
                        {t("location.countryLabel")}{" "}
                        <span className="text-destructive" aria-hidden="true">*</span>
                      </Label>
                      <Select
                        value={form.country}
                        onValueChange={updateCountry}
                      >
                        <SelectTrigger
                          id="country"
                          aria-required="true"
                          aria-invalid={errors.country ? true : undefined}
                          aria-describedby={
                            errors.country ? "country-error" : undefined
                          }
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
                          onValueChange={(v) =>
                            setForm((prev) => ({ ...prev, currency: v }))
                          }
                        >
                          <SelectTrigger
                            id="currency"
                            aria-required="true"
                            aria-invalid={errors.currency ? true : undefined}
                            aria-describedby={
                              errors.currency ? "currency-error" : undefined
                            }
                            className="h-12"
                          >
                            <SelectValue placeholder={t("location.currencyPlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCY_OPTIONS.map((c) => (
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
                          onValueChange={(v) =>
                            setForm((prev) => ({ ...prev, timezone: v }))
                          }
                        >
                          <SelectTrigger
                            id="timezone"
                            aria-required="true"
                            aria-invalid={errors.timezone ? true : undefined}
                            aria-describedby={
                              errors.timezone ? "timezone-error" : undefined
                            }
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

                <Button
                  type="button"
                  size="lg"
                  disabled={loading}
                  onClick={handleContinueToStep2}
                  className="h-12 w-full gap-2 text-base"
                >
                  {t("actions.continue")}
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </section>
            </StepPanel>
          )}

          {step === 2 && (
            <StepPanel>
              <section aria-labelledby="step2-heading" className="space-y-5">
                <div className="text-center">
                  <h1
                    id="step2-heading"
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                  >
                    {t("step2.title")}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base"
                  >
                    {t("step2.subtitle")}
                  </p>
                </div>

                <Card className="border-border bg-card">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-center gap-2 pb-2">
                      <Target
                        className="h-5 w-5 text-primary"
                        aria-hidden="true"
                      />
                      <h2 className="text-sm font-semibold text-foreground">
                        {t("step2.firstGoal")}
                      </h2>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goal-name">
                        {t("step2.nameLabel")}{" "}
                        <span className="text-muted-foreground">
                          {t("step2.nameOptional")}
                        </span>
                      </Label>
                      <Input
                        id="goal-name"
                        value={goal?.name ?? ""}
                        onChange={(e) =>
                          setGoal((prev) =>
                            prev
                              ? { ...prev, name: e.target.value }
                              : { name: e.target.value, targetAmount: "" },
                          )
                        }
                        placeholder={t("step2.namePlaceholder")}
                        aria-invalid={errors.goalName ? true : undefined}
                        aria-describedby={
                          errors.goalName ? "goal-name-error" : undefined
                        }
                        className="h-12"
                      />
                      {errors.goalName && (
                        <p
                          id="goal-name-error"
                          className="text-sm font-medium text-destructive"
                          role="alert"
                        >
                          {fieldError(errors, "goalName")}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goal-amount">
                        {t("step2.amountLabel")}{" "}
                        <span className="text-muted-foreground">
                          {t("step2.amountOptional")}
                        </span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="goal-amount"
                          type="number"
                          min={1}
                          value={goal?.targetAmount ?? ""}
                          onChange={(e) =>
                            setGoal((prev) =>
                              prev
                                ? { ...prev, targetAmount: e.target.value }
                                : { name: "", targetAmount: e.target.value },
                            )
                          }
                          placeholder={t("step2.amountPlaceholder")}
                          aria-invalid={errors.goalAmount ? true : undefined}
                          aria-describedby={
                            errors.goalAmount
                              ? "goal-amount-error"
                              : undefined
                          }
                          className="h-12"
                        />
                        <span className="text-sm font-medium text-muted-foreground">
                          {form.currency}
                        </span>
                      </div>
                      {errors.goalAmount && (
                        <p
                          id="goal-amount-error"
                          className="text-sm font-medium text-destructive"
                          role="alert"
                        >
                          {fieldError(errors, "goalAmount")}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={loading}
                    onClick={handleBack}
                    className="h-12 w-full gap-2 text-base sm:w-auto"
                  >
                    <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                    {t("actions.back")}
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    disabled={loading}
                    onClick={handleContinueToStep3}
                    className="h-12 w-full gap-2 text-base"
                  >
                    {t("actions.continue")}
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </div>
              </section>
            </StepPanel>
          )}

          {step === 3 && (
            <StepPanel>
              <section aria-labelledby="step3-heading" className="space-y-5">
                <div className="text-center">
                  <h1
                    id="step3-heading"
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                  >
                    {t("step3.title")}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    {t("step3.subtitle")}
                  </p>
                </div>

                <Card className="border-border bg-card overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 border-b border-border bg-primary/5 p-4 sm:p-5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        {mode === "BUSINESS" ? (
                          <Building2 className="h-6 w-6" aria-hidden="true" />
                        ) : mode === "PERSONAL" ? (
                          <User className="h-6 w-6" aria-hidden="true" />
                        ) : (
                          <Briefcase className="h-6 w-6" aria-hidden="true" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {t("step3.selectedMode")}
                        </p>
                        <h2 className="text-lg font-semibold text-foreground">
                          {modes.find((m) => m.id === mode)?.label}
                        </h2>
                      </div>
                    </div>

                    <div className="space-y-4 p-4 sm:p-5">
                      {isPersonal && (
                        <div className="flex items-start gap-3">
                          <User
                            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("step3.personalName")}
                            </p>
                            <p className="font-medium text-foreground">
                              {form.personalName}
                            </p>
                          </div>
                        </div>
                      )}

                      {isBusiness && (
                        <div className="flex items-start gap-3">
                          <Building2
                            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("step3.business")}
                            </p>
                            <p className="font-medium text-foreground">
                              {form.businessName}
                            </p>
                            {form.taxId && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {t("step3.taxIdPrefix")}: {form.taxId}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="h-px bg-border" aria-hidden="true" />

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="flex items-start gap-3">
                          <Globe
                            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("location.countryLabel")}
                            </p>
                            <p className="font-medium text-foreground">
                              {countryLabel(form.country, t)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Coins
                            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("location.currencyLabel")}
                            </p>
                            <p className="font-medium text-foreground">
                              {form.currency}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Clock
                            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("location.timezoneLabel")}
                            </p>
                            <p className="font-medium text-foreground">
                              {timezoneLabel(form.timezone, t)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {goal && goal.name.trim() && (
                        <div className="flex items-start gap-3">
                          <Target
                            className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("step3.initialGoal")}
                            </p>
                            <p className="font-medium text-foreground">
                              {goal.name} ·{" "}
                              {formatCurrency(
                                Number(goal.targetAmount) || 0,
                                form.currency,
                                locale,
                                { maximumFractionDigits: 0 },
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={loading}
                    onClick={handleBack}
                    className="h-12 w-full gap-2 text-base sm:w-auto"
                  >
                    <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                    {t("actions.back")}
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    disabled={loading}
                    onClick={handleConfirm}
                    className="h-12 w-full gap-2 text-base"
                  >
                    {loading ? (
                      <>
                        <Loader2
                          className="h-5 w-5 animate-spin"
                          aria-hidden="true"
                        />
                        {t("actions.saving")}
                      </>
                    ) : (
                      <>
                        {t("actions.goDashboard")}
                        <ArrowRight className="h-5 w-5" aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </div>
              </section>
            </StepPanel>
          )}
        </div>
      </main>

      <footer className="mx-auto mt-8 w-full max-w-md">
        <p className="text-center text-xs text-muted-foreground">
          {t("footer.accept")}{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            {t("footer.terms")}
          </Link>{" "}
          {t("footer.and")}{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            {t("footer.privacy")}
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}