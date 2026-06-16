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
    <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
      {scopes.map((s) => {
        const disabled = !hasBusiness && s.value !== "PERSONAL";
        return (
          <button
            key={s.value}
            type="button"
            disabled={disabled}
            onClick={() => handleChange(s.value)}
            className={cn(
              "relative rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              scope === s.value
                ? "border border-primary/20 bg-primary/5 text-primary"
                : "text-muted-foreground hover:text-foreground",
              disabled && "pointer-events-none opacity-40"
            )}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
