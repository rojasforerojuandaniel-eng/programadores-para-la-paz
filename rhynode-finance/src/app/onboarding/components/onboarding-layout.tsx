"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { StepNumber } from "../hooks/use-onboarding";
import { ONBOARDING_STEPS } from "../lib/constants";

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

interface OnboardingLayoutProps {
  step: StepNumber;
  children: React.ReactNode;
}

export default function OnboardingLayout({ step, children }: OnboardingLayoutProps) {
  const t = useTranslations("onboarding.flow");
  const totalSteps = ONBOARDING_STEPS.length;
  const stepLabels = ONBOARDING_STEPS.map((s) => t(s.labelKey));

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
                            <Check className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            n
                          )}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-medium",
                            active || completed ? "text-foreground" : "text-muted-foreground",
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

          <StepPanel key={step}>{children}</StepPanel>
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
