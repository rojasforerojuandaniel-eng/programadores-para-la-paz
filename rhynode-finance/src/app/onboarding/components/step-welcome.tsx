"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import StepOrganization from "./step-organization";
import StepCurrency from "./step-currency";
import type { OnboardingFormState } from "../lib/constants";
import type { FieldErrors } from "../hooks/use-onboarding";
import type { UserScope } from "@/lib/scope";

interface StepWelcomeProps {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  mode: UserScope | null;
  form: OnboardingFormState;
  errors: FieldErrors;
  loading: boolean;
  isPersonal: boolean;
  isBusiness: boolean;
  modeGroupRef: React.RefObject<HTMLDivElement | null>;
  onSelectMode: (mode: UserScope) => void;
  onModeKeyDown: (e: React.KeyboardEvent) => void;
  onUpdateField: <K extends keyof OnboardingFormState>(key: K, value: OnboardingFormState[K]) => void;
  onUpdateCountry: (value: string) => void;
  onContinue: () => void;
}

export default function StepWelcome({
  headingRef,
  mode,
  form,
  errors,
  loading,
  isPersonal,
  isBusiness,
  modeGroupRef,
  onSelectMode,
  onModeKeyDown,
  onUpdateField,
  onUpdateCountry,
  onContinue,
}: StepWelcomeProps) {
  const t = useTranslations("onboarding.flow");

  return (
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

      <StepOrganization
        mode={mode}
        form={form}
        errors={errors}
        isPersonal={isPersonal}
        isBusiness={isBusiness}
        modeGroupRef={modeGroupRef}
        onSelectMode={onSelectMode}
        onModeKeyDown={onModeKeyDown}
        onUpdateField={onUpdateField}
      />

      <StepCurrency
        form={form}
        errors={errors}
        onUpdateField={onUpdateField}
        onUpdateCountry={onUpdateCountry}
      />

      <Button
        type="button"
        size="lg"
        disabled={loading}
        onClick={onContinue}
        className="h-12 w-full gap-2 text-base"
      >
        {t("actions.continue")}
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Button>
    </section>
  );
}
