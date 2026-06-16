"use client";

import { useRef } from "react";
import { User, Building2, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { UserScope } from "@/lib/scope";

const modes: { id: UserScope; label: string; description: string; icon: typeof User }[] = [
  {
    id: "PERSONAL",
    label: "Personal",
    description: "Tus finanzas personales, presupuestos y metas de ahorro.",
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
    description: "Todo en un solo lugar.",
    icon: Briefcase,
  },
];

interface StepModeProps {
  selected: UserScope | null;
  onSelect: (mode: UserScope) => void;
  onContinue: () => void;
}

export default function StepMode({ selected, onSelect, onContinue }: StepModeProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  function focusOption(index: number) {
    const buttons = groupRef.current?.querySelectorAll('[role="radio"]');
    const target = buttons?.[index] as HTMLElement | undefined;
    target?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const currentIndex = modes.findIndex((m) => m.id === selected);
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
    if (targetMode && targetMode.id !== selected) {
      onSelect(targetMode.id);
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
          <h1 className="heading-section mt-4">¿Para qué usarás Rhynode?</h1>
        </div>

        <div
          ref={groupRef}
          className="space-y-4"
          role="radiogroup"
          aria-label="Modo de uso"
          aria-required="true"
          onKeyDown={handleKeyDown}
        >
          {modes.map((mode, idx) => {
            const Icon = mode.icon;
            const isSelected = selected === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected || (selected === null && idx === 0) ? 0 : -1}
                onClick={() => onSelect(mode.id)}
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
                      <h2 className="text-lg font-semibold">{mode.label}</h2>
                      <p className="body-default mt-1 text-muted-foreground">{mode.description}</p>
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
          Continuar
        </Button>
      </div>
    </div>
  );
}
