"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useScope } from "@/lib/scope-context";
import { updateUserScope } from "@/app/dashboard/actions";
import type { UserScope } from "@/lib/scope";

const scopes: { value: UserScope; label: string }[] = [
  { value: "PERSONAL", label: "Personal" },
  { value: "BUSINESS", label: "Empresa" },
  { value: "BOTH", label: "Ambas" },
];

export function ScopeToggle() {
  const { scope, setScope, hasBusiness } = useScope();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const handleChange = (newScope: UserScope) => {
    setScope(newScope);
    startTransition(async () => {
      await updateUserScope(newScope);
      router.refresh();
    });
  };

  return (
    <div className="flex min-w-0 shrink items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
      {scopes.map((s) => {
        const disabled = false;
        return (
          <button
            key={s.value}
            type="button"
            disabled={disabled}
            onClick={() => handleChange(s.value)}
            className={cn(
              "relative h-9 min-w-0 shrink-0 rounded-md px-2 sm:px-2.5 text-xs font-medium transition-all touch-manipulation whitespace-nowrap",
              scope === s.value
                ? "border border-primary/20 bg-primary/5 text-primary"
                : "text-muted-foreground hover:text-foreground",
              disabled && "pointer-events-none opacity-40"
            )}
            title={
              s.value === "BUSINESS"
                ? "Ver solo finanzas empresariales"
                : s.value === "BOTH"
                  ? "Ver finanzas personales y empresariales"
                  : "Ver solo finanzas personales"
            }
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
