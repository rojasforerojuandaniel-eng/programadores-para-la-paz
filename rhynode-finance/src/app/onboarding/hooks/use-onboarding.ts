"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import type { UserScope } from "@/lib/scope";
import { canAccessPersonal } from "@/lib/scope";
import type { Locale } from "@/lib/locale";
import { trackEvent } from "@/lib/analytics";
import {
  buildStep1Schema,
  buildGoalSchema,
  detectLocale,
  LOCALE_MAP,
  type CountryValue,
  type OnboardingFormState,
  type OnboardingGoalState,
} from "../lib/constants";

export type StepNumber = 1 | 2 | 3;

export type FieldErrors = Record<string, string[] | undefined>;

export function useOnboarding() {
  const router = useRouter();
  const t = useTranslations("onboarding.flow");
  const locale = useLocale() as Locale;

  const [step, setStep] = useState<StepNumber>(1);
  const [mode, setMode] = useState<UserScope | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [form, setForm] = useState<OnboardingFormState>(() => {
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

  const [goal, setGoal] = useState<OnboardingGoalState | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const modeGroupRef = useRef<HTMLDivElement>(null);

  const step1Schema = buildStep1Schema(t);
  const goalSchema = buildGoalSchema(t);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const isBusiness = mode === "BUSINESS" || mode === "BOTH";
  const isPersonal = mode === "PERSONAL" || mode === "BOTH";

  function updateCountry(value: string) {
    const mapped = LOCALE_MAP[value as CountryValue];
    setForm((prev) => ({
      ...prev,
      country: value as OnboardingFormState["country"],
      currency: mapped?.currency ?? prev.currency,
      timezone: mapped?.timezone ?? prev.timezone,
    }));
  }

  function updateFormField<K extends keyof OnboardingFormState>(
    key: K,
    value: OnboardingFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectMode(selected: UserScope) {
    setMode(selected);
    setErrors((prev) => ({ ...prev, mode: undefined }));
  }

  function focusModeOption(index: number) {
    const buttons = modeGroupRef.current?.querySelectorAll('[role="radio"]');
    const target = buttons?.[index] as HTMLElement | undefined;
    target?.focus();
  }

  function handleModeKeyDown(e: React.KeyboardEvent) {
    const modes: UserScope[] = ["PERSONAL", "BUSINESS", "BOTH"];
    const currentIndex = modes.findIndex((m) => m === mode);
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
    if (targetMode) {
      selectMode(targetMode);
    }
    focusModeOption(nextIndex);
  }

  function validateStep1(): FieldErrors | null {
    const parsed = step1Schema.safeParse({ ...form, mode });
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setErrors((prev) => ({ ...prev, ...flattened }));
      return flattened;
    }
    setErrors((prev) => ({
      ...prev,
      mode: undefined,
      personalName: undefined,
      businessName: undefined,
      country: undefined,
      currency: undefined,
      timezone: undefined,
    }));
    return null;
  }

  function validateStep2(): FieldErrors | null {
    if (!goal || (!goal.name.trim() && !goal.targetAmount.trim())) {
      setErrors((prev) => ({
        ...prev,
        goalName: undefined,
        goalAmount: undefined,
      }));
      return null;
    }
    const parsed = goalSchema.safeParse({
      name: goal.name,
      targetAmount: Number(goal.targetAmount),
      currency: form.currency,
    });
    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      const nextErrors: FieldErrors = {
        goalName: flattened.name,
        goalAmount: flattened.targetAmount,
      };
      setErrors((prev) => ({ ...prev, ...nextErrors }));
      return nextErrors;
    }
    setErrors((prev) => ({ ...prev, goalName: undefined, goalAmount: undefined }));
    return null;
  }

  function goToStep(target: StepNumber) {
    setStep(target);
  }

  function next() {
    if (step === 1) {
      const stepErrors = validateStep1();
      if (stepErrors) {
        const firstKey = Object.keys(stepErrors)[0];
        const el = document.getElementById(firstKey ?? "mode");
        el?.focus();
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const stepErrors = validateStep2();
      if (stepErrors) {
        document.getElementById("goal-name")?.focus();
        return;
      }
      setStep(3);
    }
  }

  function back() {
    setStep((prev) => ((prev - 1) as StepNumber));
    setErrors({});
  }

  function skip() {
    if (step === 2) {
      setGoal(null);
      setErrors((prev) => ({ ...prev, goalName: undefined, goalAmount: undefined }));
      setStep(3);
    }
  }

  async function submit() {
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
        const data = (await orgRes.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error || t("errors.saveProfile"));
        return;
      }

      let goalCreated = false;
      if (
        goal &&
        goal.name.trim() &&
        goal.targetAmount.trim() &&
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

  return {
    step,
    goToStep,
    next,
    back,
    skip,
    submit,
    mode,
    selectMode,
    handleModeKeyDown,
    modeGroupRef,
    form,
    updateFormField,
    updateCountry,
    goal,
    setGoal,
    loading,
    errors,
    setErrors,
    isBusiness,
    isPersonal,
    headingRef,
    t,
    locale,
  };
}
