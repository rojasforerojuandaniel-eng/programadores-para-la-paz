"use client";

import { ArrowLeft, ArrowRight, Loader2, User, Building2, Briefcase, Globe, Coins, Clock, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/lib/locale";
import type { UserScope } from "@/lib/scope";
import type { OnboardingGoalState, OnboardingFormState } from "../lib/constants";
import { countryLabel, timezoneLabel } from "../lib/constants";

const MODE_ICONS: Record<UserScope, typeof User> = {
  PERSONAL: User,
  BUSINESS: Building2,
  BOTH: Briefcase,
};

const MODE_LABEL_KEYS: Record<UserScope, string> = {
  PERSONAL: "modes.PERSONAL.label",
  BUSINESS: "modes.BUSINESS.label",
  BOTH: "modes.BOTH.label",
};

interface StepCompleteProps {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  mode: UserScope | null;
  form: OnboardingFormState;
  goal: OnboardingGoalState | null;
  loading: boolean;
  isPersonal: boolean;
  isBusiness: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export default function StepComplete({
  headingRef,
  mode,
  form,
  goal,
  loading,
  isPersonal,
  isBusiness,
  onBack,
  onConfirm,
}: StepCompleteProps) {
  const t = useTranslations("onboarding.flow");
  const locale = useLocale() as Locale;
  const ModeIcon = mode ? MODE_ICONS[mode] : Briefcase;

  return (
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
              <ModeIcon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t("step3.selectedMode")}
              </p>
              <h2 className="text-lg font-semibold text-foreground">
                {mode ? t(MODE_LABEL_KEYS[mode]) : ""}
              </h2>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            {isPersonal && (
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("step3.personalName")}
                  </p>
                  <p className="font-medium text-foreground">{form.personalName}</p>
                </div>
              </div>
            )}

            {isBusiness && (
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("step3.business")}
                  </p>
                  <p className="font-medium text-foreground">{form.businessName}</p>
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
                <Globe className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
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
                <Coins className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("location.currencyLabel")}
                  </p>
                  <p className="font-medium text-foreground">{form.currency}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
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
                <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
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
          onClick={onConfirm}
          className="h-12 w-full gap-2 text-base"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
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
  );
}
