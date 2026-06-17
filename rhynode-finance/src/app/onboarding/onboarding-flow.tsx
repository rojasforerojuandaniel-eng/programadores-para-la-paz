"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
  ShieldCheck,
  FileCheck,
  CreditCard,
  Globe,
  Coins,
  Clock,
  Lock,
  Pencil,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { UserScope } from "@/lib/scope";

const MODES: {
  id: UserScope;
  label: string;
  description: string;
  icon: typeof User;
}[] = [
  {
    id: "PERSONAL",
    label: "Personal",
    description: "Gestiona tus finanzas, presupuestos y metas de ahorro.",
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

interface LocaleMap {
  country: string;
  currency: string;
  timezone: string;
}

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

const LOCALE_MAP: Record<string, LocaleMap> = {
  CO: { country: "CO", currency: "COP", timezone: "America/Bogota" },
  MX: { country: "MX", currency: "MXN", timezone: "America/Mexico_City" },
  BR: { country: "BR", currency: "BRL", timezone: "America/Sao_Paulo" },
  AR: { country: "AR", currency: "ARS", timezone: "America/Argentina/Buenos_Aires" },
  CL: { country: "CL", currency: "CLP", timezone: "America/Santiago" },
  PE: { country: "PE", currency: "PEN", timezone: "America/Lima" },
  US: { country: "US", currency: "USD", timezone: "America/New_York" },
};

function detectLocale(): LocaleMap {
  const lang = typeof navigator !== "undefined" ? navigator.language : "es-CO";
  const region = lang.split("-")[1]?.toUpperCase() || "CO";
  return LOCALE_MAP[region] || LOCALE_MAP.CO;
}

function fieldErrorId(id: string) {
  return `${id}-error`;
}

function getCountryLabel(value: string) {
  return COUNTRY_OPTIONS.find((c) => c.value === value)?.label ?? value;
}

function getCurrencyLabel(value: string) {
  return CURRENCY_OPTIONS.find((c) => c.value === value)?.label ?? value;
}

function getTimezoneLabel(value: string) {
  return TIMEZONE_OPTIONS.find((t) => t.value === value)?.label ?? value;
}

function StepPanel({ children }: { children: ReactNode }) {
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
          : "translate-y-3 opacity-0"
      )}
    >
      {children}
    </div>
  );
}

const initialLocale = detectLocale();

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<UserScope | null>(null);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const step1HeadingRef = useRef<HTMLHeadingElement>(null);
  const step2HeadingRef = useRef<HTMLHeadingElement>(null);
  const step3HeadingRef = useRef<HTMLHeadingElement>(null);
  const firstModeButtonRef = useRef<HTMLButtonElement>(null);
  const modeRadiogroupRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    personalName: "",
    businessName: "",
    taxId: "",
    country: initialLocale.country,
    currency: initialLocale.currency,
    timezone: initialLocale.timezone,
  });

  useEffect(() => {
    if (step === 3) {
      step3HeadingRef.current?.focus();
    } else if (step === 2) {
      step2HeadingRef.current?.focus();
    } else {
      step1HeadingRef.current?.focus();
    }
  }, [step]);

  const isBusiness = mode === "BUSINESS" || mode === "BOTH";
  const isPersonal = mode === "PERSONAL" || mode === "BOTH";
  const selectedMode = MODES.find((m) => m.id === mode);
  const SelectedIcon = selectedMode?.icon ?? Briefcase;

  function updateCountry(value: string) {
    const mapped = LOCALE_MAP[value];
    setForm((prev) => ({
      ...prev,
      country: value,
      currency: mapped?.currency ?? prev.currency,
      timezone: mapped?.timezone ?? prev.timezone,
    }));
  }

  function validateStep(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!mode) {
      errors.mode = "Selecciona un modo para continuar.";
    }
    if (step >= 2) {
      if (isPersonal && !form.personalName.trim()) {
        errors.personalName = "Tu nombre es obligatorio.";
      }
      if (isBusiness && !form.businessName.trim()) {
        errors.businessName = "El nombre de la empresa es obligatorio.";
      }
      if (!form.country) errors.country = "Selecciona un país.";
      if (!form.currency) errors.currency = "Selecciona una moneda.";
      if (!form.timezone) errors.timezone = "Selecciona una zona horaria.";
    }
    return errors;
  }

  function handleSelectMode(selected: UserScope) {
    setMode(selected);
  }

  function focusModeRadio(index: number) {
    const buttons = modeRadiogroupRef.current?.querySelectorAll('[role="radio"]');
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
    focusModeRadio(nextIndex);
  }

  function handleContinue() {
    if (!mode) {
      setTouched((t) => ({ ...t, mode: true }));
      firstModeButtonRef.current?.focus();
      toast.error("Selecciona un modo para continuar.");
      return;
    }
    setStep(2);
  }

  function handleBack() {
    setStep(1);
  }

  function handleContinueToReview(e?: React.FormEvent) {
    e?.preventDefault();
    const errors = validateStep();
    setTouched({
      mode: true,
      personalName: true,
      businessName: true,
      taxId: true,
      country: true,
      currency: true,
      timezone: true,
    });

    if (Object.keys(errors).length > 0) {
      const firstField = Object.keys(errors)[0];
      const elementId = idForField[firstField] ?? firstField;
      const el = document.getElementById(elementId);
      el?.focus();
      toast.error(errors[firstField]);
      return;
    }

    setStep(3);
  }

  function handleBackFromReview() {
    setStep(2);
  }

  const idForField: Record<string, string> = {
    personalName: "personal-name",
    businessName: "business-name",
    country: "country",
    currency: "currency",
    timezone: "timezone",
  };

  async function handleConfirm() {
    const errors = validateStep();
    setTouched({
      mode: true,
      personalName: true,
      businessName: true,
      taxId: true,
      country: true,
      currency: true,
      timezone: true,
    });

    if (Object.keys(errors).length > 0) {
      const firstField = Object.keys(errors)[0];
      const elementId = idForField[firstField] ?? firstField;
      setStep(2);
      window.setTimeout(() => {
        const el = document.getElementById(elementId);
        el?.focus();
      }, 0);
      toast.error(errors[firstField]);
      return;
    }

    await submitOnboarding();
  }

  async function submitOnboarding() {
    const name = isBusiness ? form.businessName : form.personalName;

    setLoading(true);
    try {
      const res = await fetch("/api/organization", {
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

      if (res.ok) {
        toast.success("¡Listo! Redirigiendo al dashboard...");
        router.push("/dashboard");
      } else if (res.status === 401) {
        toast.error("Sesión expirada. Inicia sesión de nuevo.");
        router.push("/sign-in");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Error al guardar. Intenta de nuevo.");
      }
    } catch {
      toast.error("Error de red. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  }

  const errors = validateStep();
  const stepLabels = ["Elige tu modo", "Tus datos", "Revisa tu configuración"];
  const totalSteps = 3;

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-6 sm:px-6 sm:py-10">
      <main className="flex w-full flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            Paso {step} de {totalSteps}: {stepLabels[step - 1]}
          </div>

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
                                : "bg-muted text-muted-foreground"
                          )}
                        >
                          {completed ? (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          ) : (
                            n
                          )}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            active || completed
                              ? "text-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {stepLabels[idx]}
                        </span>
                      </div>
                      {!isLast && (
                        <div
                          className={cn(
                            "mx-2 h-px flex-1",
                            step > n ? "bg-primary" : "bg-border"
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
              <section aria-labelledby="step1-heading" className="space-y-4">
                <div className="text-center">
                  <h1
                    id="step1-heading"
                    ref={step1HeadingRef}
                    tabIndex={-1}
                    className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                  >
                    ¿Para qué usarás Rhynode?
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    Elige una opción para personalizar tu experiencia.
                  </p>
                </div>

                <div
                  ref={modeRadiogroupRef}
                  role="radiogroup"
                  aria-required="true"
                  aria-label="Modo de uso"
                  aria-describedby={
                    touched.mode && errors.mode ? fieldErrorId("mode") : undefined
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
                        ref={idx === 0 ? firstModeButtonRef : undefined}
                        role="radio"
                        aria-checked={selected}
                        tabIndex={selected || (mode === null && idx === 0) ? 0 : -1}
                        onClick={() => handleSelectMode(m.id)}
                        className={cn(
                          "group flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all",
                          "min-h-[72px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:border-primary/40"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors",
                            selected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground group-hover:text-primary"
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
                              : "border-muted-foreground/30"
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
                  {touched.mode && errors.mode && (
                    <p
                      id={fieldErrorId("mode")}
                      className="text-sm font-medium text-destructive"
                      role="alert"
                    >
                      {errors.mode}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  size="lg"
                  disabled={loading}
                  onClick={handleContinue}
                  className="mt-2 h-12 w-full gap-2 text-base"
                >
                  Continuar
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </section>
            </StepPanel>
          )}

          {step === 2 && mode && (
            <StepPanel>
              <section aria-labelledby="step2-heading">
                <div className="mb-4 text-center">
                  <h1
                    id="step2-heading"
                    ref={step2HeadingRef}
                    tabIndex={-1}
                    className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                  >
                    Configura tu perfil
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    Completa estos datos para empezar a usar Rhynode.
                  </p>
                </div>

                <form onSubmit={handleContinueToReview} className="space-y-5">
                  {isPersonal && (
                    <fieldset className="space-y-4 rounded-xl border border-border bg-card p-4">
                      <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <User className="h-4 w-4 text-primary" aria-hidden="true" />
                        Datos personales
                      </legend>
                      <div className="space-y-2">
                        <Label htmlFor="personal-name">
                          Tu nombre <span aria-hidden="true">*</span>
                        </Label>
                        <Input
                          id="personal-name"
                          value={form.personalName}
                          onChange={(e) =>
                            setForm({ ...form, personalName: e.target.value })
                          }
                          onBlur={() =>
                            setTouched((t) => ({ ...t, personalName: true }))
                          }
                          placeholder="Ej. Juan Pérez"
                          aria-required="true"
                          aria-invalid={
                            touched.personalName && !!errors.personalName
                          }
                          aria-describedby={
                            touched.personalName && errors.personalName
                              ? fieldErrorId("personal-name")
                              : undefined
                          }
                          className="h-12"
                        />
                        {touched.personalName && errors.personalName && (
                          <p
                            id={fieldErrorId("personal-name")}
                            className="text-sm font-medium text-destructive"
                            role="alert"
                          >
                            {errors.personalName}
                          </p>
                        )}
                      </div>
                    </fieldset>
                  )}

                  {isBusiness && (
                    <fieldset className="space-y-4 rounded-xl border border-border bg-card p-4">
                      <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Building2
                          className="h-4 w-4 text-primary"
                          aria-hidden="true"
                        />
                        Datos de la empresa
                      </legend>
                      <div className="space-y-2">
                        <Label htmlFor="business-name">
                          Nombre de la empresa <span aria-hidden="true">*</span>
                        </Label>
                        <Input
                          id="business-name"
                          value={form.businessName}
                          onChange={(e) =>
                            setForm({ ...form, businessName: e.target.value })
                          }
                          onBlur={() =>
                            setTouched((t) => ({ ...t, businessName: true }))
                          }
                          placeholder="Ej. Mi Empresa SAS"
                          aria-required="true"
                          aria-invalid={
                            touched.businessName && !!errors.businessName
                          }
                          aria-describedby={
                            touched.businessName && errors.businessName
                              ? fieldErrorId("business-name")
                              : undefined
                          }
                          className="h-12"
                        />
                        {touched.businessName && errors.businessName && (
                          <p
                            id={fieldErrorId("business-name")}
                            className="text-sm font-medium text-destructive"
                            role="alert"
                          >
                            {errors.businessName}
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
                            setForm({ ...form, taxId: e.target.value })
                          }
                          placeholder="Ej. 900.123.456-7"
                          className="h-12"
                        />
                      </div>
                    </fieldset>
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
                          País <span aria-hidden="true">*</span>
                        </Label>
                        <Select value={form.country} onValueChange={updateCountry}>
                          <SelectTrigger
                            id="country"
                            aria-required="true"
                            aria-invalid={touched.country && !!errors.country}
                            aria-describedby={
                              touched.country && errors.country
                                ? fieldErrorId("country")
                                : undefined
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
                        {touched.country && errors.country && (
                          <p
                            id={fieldErrorId("country")}
                            className="text-sm font-medium text-destructive"
                            role="alert"
                          >
                            {errors.country}
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="currency">
                            Moneda <span aria-hidden="true">*</span>
                          </Label>
                          <Select
                            value={form.currency}
                            onValueChange={(v) =>
                              setForm({ ...form, currency: v })
                            }
                          >
                            <SelectTrigger
                              id="currency"
                              aria-required="true"
                              aria-invalid={touched.currency && !!errors.currency}
                              aria-describedby={
                                touched.currency && errors.currency
                                  ? fieldErrorId("currency")
                                  : undefined
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
                          {touched.currency && errors.currency && (
                            <p
                              id={fieldErrorId("currency")}
                              className="text-sm font-medium text-destructive"
                              role="alert"
                            >
                              {errors.currency}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="timezone">
                            Zona horaria <span aria-hidden="true">*</span>
                          </Label>
                          <Select
                            value={form.timezone}
                            onValueChange={(v) =>
                              setForm({ ...form, timezone: v })
                            }
                          >
                            <SelectTrigger
                              id="timezone"
                              aria-required="true"
                              aria-invalid={
                                touched.timezone && !!errors.timezone
                              }
                              aria-describedby={
                                touched.timezone && errors.timezone
                                  ? fieldErrorId("timezone")
                                  : undefined
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
                          {touched.timezone && errors.timezone && (
                            <p
                              id={fieldErrorId("timezone")}
                              className="text-sm font-medium text-destructive"
                              role="alert"
                            >
                              {errors.timezone}
                            </p>
                          )}
                        </div>
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
                      type="submit"
                      size="lg"
                      disabled={loading}
                      className="h-12 w-full gap-2 text-base"
                    >
                      Continuar
                      <ArrowRight className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </div>
                </form>
              </section>
            </StepPanel>
          )}

          {step === 3 && mode && (
            <StepPanel>
              <section aria-labelledby="step3-heading">
                <div className="mb-4 text-center">
                  <h1
                    id="step3-heading"
                    ref={step3HeadingRef}
                    tabIndex={-1}
                    className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                  >
                    Revisa tu configuración
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    Confirma que todo esté correcto antes de continuar.
                  </p>
                </div>

                <div className="space-y-5">
                  <Card className="border-border bg-card overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-center gap-4 border-b border-border bg-primary/5 p-4 sm:p-5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                          <SelectedIcon className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Modo seleccionado
                          </p>
                          <h2 className="text-lg font-semibold text-foreground">
                            {selectedMode?.label}
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
                                {getCountryLabel(form.country)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Coins
                              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                            <div>
                              <p className="text-xs text-muted-foreground">Moneda</p>
                              <p className="font-medium text-foreground">
                                {getCurrencyLabel(form.currency)}
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
                                {getTimezoneLabel(form.timezone)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="rounded-xl border border-border bg-card p-4">
                    <h2 className="mb-3 text-center text-sm font-semibold text-foreground">
                      Tu información está protegida
                    </h2>
                    <ul className="grid gap-3 sm:grid-cols-3">
                      <li className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Lock
                          className="h-4 w-4 text-emerald-500"
                          aria-hidden="true"
                        />
                        Encriptación de datos
                      </li>
                      <li className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <FileCheck
                          className="h-4 w-4 text-primary"
                          aria-hidden="true"
                        />
                        Cumplimiento DIAN
                      </li>
                      <li className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <CreditCard
                          className="h-4 w-4 text-amber-500"
                          aria-hidden="true"
                        />
                        Sin tarjeta de crédito
                      </li>
                    </ul>
                  </div>

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      disabled={loading}
                      onClick={handleBackFromReview}
                      className="h-12 w-full gap-2 text-base sm:w-auto"
                    >
                      <Pencil className="h-5 w-5" aria-hidden="true" />
                      Editar
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
                          Confirmar e ir al Dashboard
                          <Check className="h-5 w-5" aria-hidden="true" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </section>
            </StepPanel>
          )}
        </div>
      </main>

      <footer className="mx-auto mt-8 w-full max-w-md">
        <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            Encriptación de datos
          </li>
          <li className="inline-flex items-center gap-1.5">
            <FileCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Cumplimiento DIAN
          </li>
          <li className="inline-flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-amber-500" aria-hidden="true" />
            Sin tarjeta de crédito
          </li>
        </ul>
      </footer>
    </div>
  );
}
