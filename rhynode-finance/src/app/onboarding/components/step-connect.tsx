"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target } from "lucide-react";
import type { FieldErrors } from "../hooks/use-onboarding";
import type { OnboardingGoalState, OnboardingFormState } from "../lib/constants";

interface StepConnectProps {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  goal: OnboardingGoalState | null;
  form: OnboardingFormState;
  errors: FieldErrors;
  loading: boolean;
  onUpdateGoal: (goal: OnboardingGoalState | null) => void;
  onContinue: () => void;
  onBack: () => void;
}

function fieldError(errors: FieldErrors, key: string) {
  return errors[key]?.[0];
}

export default function StepConnect({
  headingRef,
  goal,
  form,
  errors,
  loading,
  onUpdateGoal,
  onContinue,
  onBack,
}: StepConnectProps) {
  const t = useTranslations("onboarding.flow");

  function updateName(value: string) {
    onUpdateGoal(
      goal ? { ...goal, name: value } : { name: value, targetAmount: "" },
    );
  }

  function updateAmount(value: string) {
    onUpdateGoal(
      goal ? { ...goal, targetAmount: value } : { name: "", targetAmount: value },
    );
  }

  return (
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
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {t("step2.subtitle")}
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2 pb-2">
            <Target className="h-5 w-5 text-primary" aria-hidden="true" />
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
              onChange={(e) => updateName(e.target.value)}
              placeholder={t("step2.namePlaceholder")}
              aria-invalid={errors.goalName ? true : undefined}
              aria-describedby={errors.goalName ? "goal-name-error" : undefined}
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
                onChange={(e) => updateAmount(e.target.value)}
                placeholder={t("step2.amountPlaceholder")}
                aria-invalid={errors.goalAmount ? true : undefined}
                aria-describedby={errors.goalAmount ? "goal-amount-error" : undefined}
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
          onClick={onBack}
          className="h-12 w-full gap-2 text-base sm:w-auto"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          {t("actions.back")}
        </Button>
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
      </div>
    </section>
  );
}
