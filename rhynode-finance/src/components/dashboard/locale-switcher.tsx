"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getLocaleClient, LOCALE_COOKIE, type Locale } from "@/lib/locale";

const MAX_AGE = 60 * 60 * 24 * 365;

/**
 * es / en toggle for the dashboard. Unlike the landing switcher (which
 * navigates between "/" and "/en"), the dashboard locale is cookie-based, so
 * this sets the cookie and triggers a server re-render via router.refresh() —
 * the dashboard layout re-reads the cookie and re-renders in the new locale.
 */
export function DashboardLocaleSwitcher() {
  const router = useRouter();
  const current = getLocaleClient();

  function switchTo(locale: Locale) {
    if (typeof document !== "undefined") {
      document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
    }
    router.refresh();
  }

  return (
    <div
      className="flex items-center gap-1 rounded-md border border-border/60 p-0.5 text-xs font-medium"
      role="group"
      aria-label="Idioma / Language"
    >
      <Button
        type="button"
        variant={current === "es" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-2"
        aria-pressed={current === "es"}
        onClick={() => switchTo("es")}
      >
        ES
      </Button>
      <Button
        type="button"
        variant={current === "en" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-2"
        aria-pressed={current === "en"}
        onClick={() => switchTo("en")}
      >
        EN
      </Button>
    </div>
  );
}