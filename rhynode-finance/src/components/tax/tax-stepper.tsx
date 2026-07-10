"use client";

import { cn } from "@/lib/utils";
import { type TFn } from "@/lib/tax-calculator";

interface TaxStepperProps {
  step: number;
  result: unknown;
  t: TFn;
  onStepClick: (id: number) => void;
}

const steps = [
  { id: 1, labelKey: "calculator.steps.income.label" },
  { id: 2, labelKey: "calculator.steps.deductions.label" },
  { id: 3, labelKey: "calculator.steps.regime.label" },
  { id: 4, labelKey: "calculator.steps.results.label" },
] as const;

export function TaxStepper({
  step,
  result,
  t,
  onStepClick,
}: TaxStepperProps) {
  return (
    <nav aria-label={t("calculator.stepsNavAria")}>
      <div className="relative">
        <div className="absolute top-[1.125rem] left-0 right-0 h-1 rounded-full bg-muted" />
        <div
          className="absolute top-[1.125rem] left-0 h-1 rounded-full bg-primary transition-all"
          style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
        />
        <ol className="relative z-10 flex items-start justify-between gap-2">
          {steps.map((s) => {
            const active = s.id === step;
            const completed = s.id < step;
            const stepLabel = t(s.labelKey);
            return (
              <li key={s.id} className="flex flex-1 flex-col items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (s.id <= step || result) onStepClick(s.id);
                  }}
                  disabled={s.id > step && !result}
                  aria-current={active ? "step" : undefined}
                  aria-label={t("calculator.stepAria", {
                    id: s.id,
                    label: stepLabel,
                  })}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : completed
                        ? "border-primary bg-background text-primary"
                        : "border-muted bg-background text-muted-foreground",
                    s.id > step && !result && "cursor-not-allowed opacity-50"
                  )}
                >
                  {completed ? (
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden={true}
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    s.id
                  )}
                </button>
                <span
                  className={cn(
                    "mt-2 hidden text-center text-xs font-medium sm:inline",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {stepLabel}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
