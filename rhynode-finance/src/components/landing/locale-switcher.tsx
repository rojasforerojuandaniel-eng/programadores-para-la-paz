"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const LOCALE_COOKIE = "rhynode-locale";
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function setLocaleCookie(locale: "es" | "en") {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

function getLocaleCookie(): "es" | "en" | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`));
  if (!match) return null;
  const value = match.split("=")[1];
  return value === "en" || value === "es" ? value : null;
}

/**
 * es / en toggle for the landing navbar. Navigates between "/" (es) and "/en"
 * and persists the choice in a cookie so auto-detection won't override it.
 */
export function LocaleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const current: "es" | "en" = pathname.startsWith("/en") ? "en" : "es";

  function switchTo(locale: "es" | "en") {
    setLocaleCookie(locale);
    router.push(locale === "en" ? "/en" : "/");
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

/**
 * Keeps <html lang> in sync with the rendered landing locale. The root layout
 * defaults to "es"; this corrects it on "/en" without middleware.
 */
export function LocaleSync({ locale }: { locale: "es" | "en" }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}

/**
 * One-time auto-detect rendered on the "/" landing: if the user has no explicit
 * locale cookie and their browser prefers English, send them to /en. Cookie is
 * set so it only happens once (no redirect loop). No middleware/auth involved.
 */
export function LocaleAutoDetect() {
  useEffect(() => {
    if (getLocaleCookie()) return;
    const langs =
      typeof navigator !== "undefined"
        ? (navigator.languages ?? [navigator.language])
        : [];
    const prefersEn = langs.some((l) => l.toLowerCase().startsWith("en"));
    if (prefersEn) {
      setLocaleCookie("en");
      window.location.replace("/en");
    } else {
      setLocaleCookie("es");
    }
  }, []);
  return null;
}