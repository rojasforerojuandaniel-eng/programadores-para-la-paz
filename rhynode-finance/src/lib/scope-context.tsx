"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { UserScope } from "@/lib/scope";

interface ScopeContextValue {
  scope: UserScope;
  setScope: (scope: UserScope) => void;
  hasBusiness: boolean;
}

const ScopeContext = createContext<ScopeContextValue | null>(null);

export function ScopeProvider({
  children,
  initialScope,
  hasBusiness,
}: {
  children: React.ReactNode;
  initialScope: UserScope;
  hasBusiness: boolean;
}) {
  const [scope, setScopeState] = useState<UserScope>(initialScope);

  const setScope = useCallback((newScope: UserScope) => {
    setScopeState(newScope);
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
