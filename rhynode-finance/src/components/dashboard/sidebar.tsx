"use client";

import { ScopeToggle } from "./scope-toggle";
import { GlobalSearch } from "./global-search";
import { NotificationCenter } from "./notification-center";
import { DashboardHeader } from "./header";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavLinks } from "./nav-links";
import { UserSection } from "./user-section";

export function Sidebar() {
  return (
    <>
      <DashboardHeader />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-6">
            <Logo href="/dashboard" />
            <NotificationCenter />
          </div>
          <div className="px-6 pb-3">
            <GlobalSearch />
          </div>
          <div className="px-6 pb-2">
            <ScopeToggle />
          </div>
          <NavLinks />
          <div className="mt-auto space-y-2 border-t border-border p-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-muted-foreground">Tema</span>
              <ThemeToggle />
            </div>
            <UserSection />
          </div>
        </div>
      </aside>
    </>
  );
}
