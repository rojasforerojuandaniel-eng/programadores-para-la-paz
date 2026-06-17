"use client";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ScopeToggle } from "./scope-toggle";
import { CommandPalette } from "./command-palette";
import { NotificationCenter } from "./notification-center";

export function DashboardHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/90 px-3 backdrop-blur-md lg:hidden">
      <Logo href="/dashboard" />
      <div className="flex min-w-0 shrink items-center gap-0.5">
        <CommandPalette />
        <div className="hidden min-w-0 shrink sm:block">
          <ScopeToggle />
        </div>
        <ThemeToggle />
        <NotificationCenter />
      </div>
    </header>
  );
}
