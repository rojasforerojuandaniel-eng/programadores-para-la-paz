"use client";

import { useEffect, useState } from "react";

export type PlanResource = "invoices" | "users";

interface PlanLimitState {
  allowed: boolean;
  limit: number;
  current: number;
  planName: string;
  loading: boolean;
  error: string | null;
}

export function usePlanLimit(resource: PlanResource): PlanLimitState {
  const [state, setState] = useState<PlanLimitState>({
    allowed: true,
    limit: Infinity,
    current: 0,
    planName: "Starter",
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch("/api/subscribe/plan", { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Failed to fetch plan: ${res.status}`);
        }
        const data = await res.json();
        const plan = data.plan;
        if (!plan) {
          throw new Error("Invalid plan response");
        }

        const limit = resource === "invoices" ? plan.invoicesLimit : plan.usersLimit;
        const current = resource === "invoices" ? plan.invoicesUsed : plan.usersUsed;
        const allowed = limit === Infinity || current < limit;

        setState({
          allowed,
          limit,
          current,
          planName: plan.name,
          loading: false,
          error: null,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    }

    load();

    return () => controller.abort();
  }, [resource]);

  return state;
}
