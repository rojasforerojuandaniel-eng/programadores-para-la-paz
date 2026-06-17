"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import type { OrganizationRole } from "@/lib/organization";

interface UseOrganizationRoleResult {
  role: OrganizationRole | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  canEdit: boolean;
  canView: boolean;
}

export function useOrganizationRole(): UseOrganizationRoleResult {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<OrganizationRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    const controller = new AbortController();

    fetch("/api/organization/members/me", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch role: ${res.status}`);
        }
        return res.json();
      })
      .then((data: { role?: OrganizationRole }) => {
        setRole(data.role ?? null);
      })
      .catch((err) => {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unknown error");
      });

    return () => controller.abort();
  }, [isLoaded, user?.id]);

  const loading = !isLoaded || (!!user?.id && role === null && !error);

  return {
    role,
    loading,
    error,
    isAdmin: role === "ADMIN",
    canEdit: role === "ADMIN" || role === "MANAGER",
    canView: role === "ADMIN" || role === "MANAGER" || role === "VIEWER",
  };
}
