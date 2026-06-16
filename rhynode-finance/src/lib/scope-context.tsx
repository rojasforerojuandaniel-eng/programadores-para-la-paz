"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { UserScope } from "@/lib/scope";

interface ScopeContextValue {
  scope: UserScope;
  setScope: (scope: UserScope) => void;
  hasBusiness: boolean;
}

const ScopeContext = createContext<ScopeContextValue | null>(null);

const STORAGE_KEY = "rhynode-scope";

function getStoredScope(): UserScope | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "PERSONAL" || raw === "BUSINESS" || raw === "BOTH") return raw;
  } catch {
    // localStorage puede fallar en modo privado
  }
  return null;
}

export function ScopeProvider({
  children,
  initialScope,
  hasBusiness,
}: {
  children: React.ReactNode;
  initialScope: UserScope;
  hasBusiness: boolean;
}) {
  const [scope, setScopeState] = useState<UserScope>(() => getStoredScope() ?? initialScope);

  const setScope = useCallback((newScope: UserScope) => {
    setScopeState(newScope);
    try {
      localStorage.setItem(STORAGE_KEY, newScope);
    } catch {
      // noop
    }
  }, []);

  return (
    <ScopeContext.Provider value={{ scope, setScope, hasBusiness }}>
      {children}
    </ScopeContext.Provider>
  );
}

export function useScope(): ScopeContextValue {
  const ctx = useContext(ScopeContext);
  if (!ctx) {
    throw new Error("useScope must be used within ScopeProvider");
  }
  return ctx;
}
