"use client";

import { useRef } from "react";
import { User, Building2, Briefcase } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { UserScope } from "@/lib/scope";

const MODE_IDS = ["PERSONAL", "BUSINESS", "BOTH"] as const satisfies readonly UserScope[];
const MODE_ICONS: Record<UserScope, typeof User> = {
  PERSONAL: User,
  BUSINESS: Building2,
  BOTH: Briefcase,
};

interface StepModeProps {
  selected: UserScope | null;
  onSelect: (mode: UserScope) => void;
  onContinue: () => void;
}

export default function StepMode({ selected, onSelect, onContinue }: StepModeProps) {
  const t = useTranslations("onboarding.flow");
  const groupRef = useRef<HTMLDivElement>(null);

  function focusOption(index: number) {
    const buttons = groupRef.current?.querySelectorAll('[role="radio"]');
    const target = buttons?.[index] as HTMLElement | undefined;
    target?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const currentIndex = MODE_IDS.findIndex((m) => m === selected);
    let nextIndex = currentIndex;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      nextIndex = currentIndex < MODE_IDS.length - 1 ? currentIndex + 1 : 0;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      nextIndex = currentIndex > 0 ? currentIndex - 1 : MODE_IDS.length - 1;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = MODE_IDS.length - 1;
    } else {
      return;
    }
    const targetMode = MODE_IDS[nextIndex];
    if (targetMode && targetMode !== selected) {
      onSelect(targetMode);
    }
    focusOption(nextIndex);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <div className="mb-2 inline-flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Briefcase className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">Rhynode</span>
          </div>
          <h1 className="heading-section mt-4">{t("modeStep.title")}</h1>
        </div>

        <div
          ref={groupRef}
          className="space-y-4"
          role="radiogroup"
          aria-label={t("aria.modeGroup")}
          aria-required="true"
          onKeyDown={handleKeyDown}
        >
          {MODE_IDS.map((modeId, idx) => {
            const Icon = MODE_ICONS[modeId];
            const isSelected = selected === modeId;
            return (
              <button
                key={modeId}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected || (selected === null && idx === 0) ? 0 : -1}
                onClick={() => onSelect(modeId)}
                className="group block w-full text-left rounded-xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card
                  className={`cursor-pointer transition-all hover:border-primary/30 ${
                    isSelected
                      ? "border-2 border-primary bg-primary/5"
                      : "border border-border surface-elevated-2"
                  }`}
                >
                  <CardContent className="flex items-start gap-4 p-6">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                      }`}
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">{t(`modes.${modeId}.label` as never)}</h2>
                      <p className="body-default mt-1 text-muted-foreground">
                        {t(`modes.${modeId}.description` as never)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>

        <Button
          className="mt-6 w-full gap-2"
          disabled={!selected}
          onClick={onContinue}
        >
          {t("actions.continue")}
        </Button>
      </div>
    </div>
  );
}