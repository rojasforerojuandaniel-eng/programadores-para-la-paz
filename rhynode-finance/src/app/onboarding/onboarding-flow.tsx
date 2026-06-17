"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { z } from "zod";

const COUNTRY_OPTIONS = [
  { value: "CO", label: "Colombia" },
  { value: "MX", label: "México" },
  { value: "BR", label: "Brasil" },
  { value: "AR", label: "Argentina" },
  { value: "CL", label: "Chile" },
  { value: "PE", label: "Perú" },
] as const;

const CURRENCY_OPTIONS = [
  { value: "COP", label: "COP" },
  { value: "MXN", label: "MXN" },
  { value: "BRL", label: "BRL" },
  { value: "ARS", label: "ARS" },
  { value: "CLP", label: "CLP" },
  { value: "PEN", label: "PEN" },
  { value: "USD", label: "USD" },
] as const;

const TIMEZONE_OPTIONS = [
  { value: "America/Bogota", label: "Bogotá" },
  { value: "America/Mexico_City", label: "Ciudad de México" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires" },
  { value: "America/Santiago", label: "Santiago" },
  { value: "America/Lima", label: "Lima" },
] as const;

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

const MODES: {
  id: UserScope;
  label: string;
  description: string;
  icon: typeof User;
}[] = [
  {
    id: "PERSONAL",
    label: "Personal",
    description: "Tus finanzas, presupuestos y metas de ahorro.",
    icon: User,
  },
  {
    id: "BUSINESS",
    label: "Empresa",
    description: "Facturación, impuestos y control de tu negocio.",
    icon: Building2,
  },
  {
    id: "BOTH",
    label: "Ambas",
    description: "Finanzas personales y empresariales en un solo lugar.",
    icon: Briefcase,
  },
];

function detectLocale() {
  const lang =
    typeof navigator !== "undefined" ? navigator.language : "es-CO";
  const region = lang.split("-")[1]?.toUpperCase() || "CO";
  return LOCALE_MAP[region] || LOCALE_MAP.CO;
}

const initialLocale = detectLocale();

const step1Schema = z
  .object({
    mode: z.enum(["PERSONAL", "BUSINESS", "BOTH"], {
      message: "Selecciona un modo para continuar.",
    }),
    personalName: z.string(),
    businessName: z.string(),
    taxId: z.string(),
    country: z.enum(["CO", "MX", "BR", "AR", "CL", "PE"], {
      message: "Selecciona un país.",
    }),
    currency: z.enum(["COP", "MXN", "BRL", "ARS", "CLP", "PEN", "USD"], {
      message: "Selecciona una moneda.",
    }),
    timezone: z.string().min(1, "Selecciona una zona horaria."),
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
          message: "Tu nombre es obligatorio.",
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
          message: "El nombre de la empresa es obligatorio.",
          path: ["businessName"],
        });
      }
    }
  });

const goalSchema = z.object({
  name: z.string().min(1, "El nombre de la meta es obligatorio."),
  targetAmount: z.number().min(1, "El monto objetivo debe ser mayor a 0."),
  currency: z.string().min(1, "Selecciona una moneda."),
});

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

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<UserScope | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const [form, setForm] = useState({
    personalName: "",
    businessName: "",
    taxId: "",
    country: initialLocale.country,
    currency: initialLocale.currency,
    timezone: initialLocale.timezone,
  });

  const [goal, setGoal] = useState<{
    name: string;
    targetAmount: string;
  } | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const modeGroupRef = useRef<HTMLDivElement>(null);

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
    const currentIndex = MODES.findIndex((m) => m.id === mode);
    let nextIndex = currentIndex;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      nextIndex = currentIndex < MODES.length - 1 ? currentIndex + 1 : 0;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      nextIndex = currentIndex > 0 ? currentIndex - 1 : MODES.length - 1;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = MODES.length - 1;
    } else {
      return;
    }
    const targetMode = MODES[nextIndex];
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
      toast.error("Revisa los datos antes de continuar.");
      return;
    }

    if (!mode) {
      toast.error("Selecciona un modo para continuar.");
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
          toast.error("Sesión expirada. Inicia sesión de nuevo.");
          router.push("/sign-in");
          return;
        }
        const data = (await orgRes.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(data.error || "Error al guardar tu perfil.");
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

      toast.success("¡Listo! Redirigiendo a tu dashboard...");
      router.push("/dashboard/personal");
    } catch {
      toast.error("Error de red. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  }

  const stepLabels = ["Tus datos", "Objetivos", "Completado"];
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
              aria-label="Progreso del onboarding"
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
                    Configura tu perfil
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    Elige cómo usarás Rhynode y completa tus datos.
                  </p>
                </div>

                <div
                  id="mode"
                  ref={modeGroupRef}
                  tabIndex={-1}
                  role="radiogroup"
                  aria-required="true"
                  aria-label="Modo de uso"
                  aria-invalid={errors.mode ? true : undefined}
                  aria-describedby={
                    errors.mode ? "mode-error" : undefined
                  }
                  className="space-y-3"
                  onKeyDown={handleModeKeyDown}
                >
                  {MODES.map((m, idx) => {
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
                        Datos personales
                      </h2>
                      <div className="space-y-2">
                        <Label htmlFor="personal-name">
                          Tu nombre{" "}
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
                          placeholder="Ej. Juan Pérez"
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
                        Datos de la empresa
                      </h2>
                      <div className="space-y-2">
                        <Label htmlFor="business-name">
                          Nombre de la empresa{" "}
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
                          placeholder="Ej. Mi Empresa SAS"
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
                          NIT / RFC / CNPJ{" "}
                          <span className="text-muted-foreground">(opcional)</span>
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
                          placeholder="Ej. 900.123.456-7"
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
                      Ubicación y moneda
                    </h2>
                    <div className="space-y-2">
                      <Label htmlFor="country">
                        País{" "}
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
                          <SelectValue placeholder="Selecciona un país" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_OPTIONS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
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
                          Moneda{" "}
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
                            <SelectValue placeholder="Moneda" />
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
                          Zona horaria{" "}
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
                            <SelectValue placeholder="Zona" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEZONE_OPTIONS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
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
                  Continuar
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
                    Define tu primer objetivo
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base"
>
                    Opcional: crea una meta de ahorro para empezar con foco.
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
                        Primera meta
                      </h2>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goal-name">
                        Nombre de la meta{" "}
                        <span className="text-muted-foreground">
                          (opcional)
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
                        placeholder="Ej. Vacaciones, fondo de emergencia..."
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
                        Monto objetivo{" "}
                        <span className="text-muted-foreground">
                          (opcional)
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
                          placeholder="Ej. 1000000"
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
                    Atrás
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    disabled={loading}
                    onClick={handleContinueToStep3}
                    className="h-12 w-full gap-2 text-base"
                  >
                    Continuar
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
                    Todo listo
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    Revisa tu configuración y entra a tu dashboard.
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
                          Modo seleccionado
                        </p>
                        <h2 className="text-lg font-semibold text-foreground">
                          {MODES.find((m) => m.id === mode)?.label}
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
                              Nombre personal
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
                              Empresa
                            </p>
                            <p className="font-medium text-foreground">
                              {form.businessName}
                            </p>
                            {form.taxId && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                NIT / RFC / CNPJ: {form.taxId}
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
                            <p className="text-xs text-muted-foreground">País</p>
                            <p className="font-medium text-foreground">
                              {COUNTRY_OPTIONS.find((c) => c.value === form.country)
                                ?.label ?? form.country}
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
                              Moneda
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
                              Zona horaria
                            </p>
                            <p className="font-medium text-foreground">
                              {TIMEZONE_OPTIONS.find((t) => t.value === form.timezone)
                                ?.label ?? form.timezone}
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
                              Meta inicial
                            </p>
                            <p className="font-medium text-foreground">
                              {goal.name} ·{" "}
                              {new Intl.NumberFormat("es-CO", {
                                style: "currency",
                                currency: form.currency,
                                maximumFractionDigits: 0,
                              }).format(Number(goal.targetAmount) || 0)}
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
                    Atrás
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
                        Guardando...
                      </>
                    ) : (
                      <>
                        Ir al Dashboard
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
          Al continuar aceptas los{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Términos de servicio
          </Link>{" "}
          y{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Política de privacidad
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}
