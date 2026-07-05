"use client";

import { useTranslations } from "next-intl";
import { User, Building2, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { UserScope } from "@/lib/scope";
import type { OnboardingFormState } from "../lib/constants";
import type { FieldErrors } from "../hooks/use-onboarding";

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

const MODE_DESC_KEYS: Record<UserScope, string> = {
  PERSONAL: "modes.PERSONAL.description",
  BUSINESS: "modes.BUSINESS.description",
  BOTH: "modes.BOTH.description",
};

interface StepOrganizationProps {
  mode: UserScope | null;
  form: OnboardingFormState;
  errors: FieldErrors;
  isPersonal: boolean;
  isBusiness: boolean;
  modeGroupRef: React.RefObject<HTMLDivElement | null>;
  onSelectMode: (mode: UserScope) => void;
  onModeKeyDown: (e: React.KeyboardEvent) => void;
  onUpdateField: <K extends keyof OnboardingFormState>(key: K, value: OnboardingFormState[K]) => void;
}

function fieldError(errors: FieldErrors, key: string) {
  return errors[key]?.[0];
}

export default function StepOrganization({
  mode,
  form,
  errors,
  isPersonal,
  isBusiness,
  modeGroupRef,
  onSelectMode,
  onModeKeyDown,
  onUpdateField,
}: StepOrganizationProps) {
  const t = useTranslations("onboarding.flow");
  const modes: UserScope[] = ["PERSONAL", "BUSINESS", "BOTH"];

  return (
    <div className="space-y-5">
      <div
        id="mode"
        ref={modeGroupRef}
        tabIndex={-1}
        role="radiogroup"
        aria-required="true"
        aria-label={t("aria.modeGroup")}
        aria-invalid={errors.mode ? true : undefined}
        aria-describedby={errors.mode ? "mode-error" : undefined}
        className="space-y-3"
        onKeyDown={onModeKeyDown}
      >
        {modes.map((modeId, idx) => {
          const Icon = MODE_ICONS[modeId];
          const selected = mode === modeId;
          return (
            <button
              key={modeId}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (mode === null && idx === 0) ? 0 : -1}
              onClick={() => onSelectMode(modeId)}
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
                  {t(MODE_LABEL_KEYS[modeId])}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t(MODE_DESC_KEYS[modeId])}
                </p>
              </div>
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                  selected ? "border-primary bg-primary" : "border-muted-foreground/30",
                )}
                aria-hidden="true"
              >
                {selected && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
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
              <User className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("personalData.title")}
            </h2>
            <div className="space-y-2">
              <Label htmlFor="personal-name">
                {t("personalData.nameLabel")}{" "}
                <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id="personal-name"
                value={form.personalName}
                onChange={(e) => onUpdateField("personalName", e.target.value)}
                placeholder={t("personalData.namePlaceholder")}
                aria-required="true"
                aria-invalid={errors.personalName ? true : undefined}
                aria-describedby={errors.personalName ? "personal-name-error" : undefined}
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
              <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("businessData.title")}
            </h2>
            <div className="space-y-2">
              <Label htmlFor="business-name">
                {t("businessData.nameLabel")}{" "}
                <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id="business-name"
                value={form.businessName}
                onChange={(e) => onUpdateField("businessName", e.target.value)}
                placeholder={t("businessData.namePlaceholder")}
                aria-required="true"
                aria-invalid={errors.businessName ? true : undefined}
                aria-describedby={errors.businessName ? "business-name-error" : undefined}
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
                onChange={(e) => onUpdateField("taxId", e.target.value)}
                placeholder={t("businessData.taxIdPlaceholder")}
                className="h-12"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
