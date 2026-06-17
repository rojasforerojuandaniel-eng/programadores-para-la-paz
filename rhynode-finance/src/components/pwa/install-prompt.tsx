"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

const DISMISS_KEY = "rhynode-pwa-install-dismissed-v2";
const DISMISS_DAYS = 7;
const DISMISS_MS = DISMISS_DAYS * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface DismissRecord {
  version: number;
  dismissedAt: number;
}

function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw) as DismissRecord;
    if (parsed.version !== 1 || typeof parsed.dismissedAt !== "number") {
      return false;
    }
    return Date.now() - parsed.dismissedAt < DISMISS_MS;
  } catch {
    localStorage.removeItem(DISMISS_KEY);
    return false;
  }
}

function setDismissed(): void {
  if (typeof window === "undefined") return;
  const record: DismissRecord = { version: 1, dismissedAt: Date.now() };
  localStorage.setItem(DISMISS_KEY, JSON.stringify(record));
}

function isMobileOrTablet(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1024px), (pointer: coarse)").matches;
}

function logPwaEvent(
  event:
    | "pwa_install_prompted"
    | "pwa_install_completed"
    | "pwa_install_prompt_dismissed",
  properties?: Record<string, string | number | boolean | null>
): void {
  const payload = { event, properties, timestamp: Date.now() };

  trackEvent(event, properties ?? undefined);

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[PWA Analytics]", payload);
  }
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMobileOrTablet()) return;
    if (isDismissed()) return;

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      const promptEvent = e as unknown as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setVisible(true);
      logPwaEvent("pwa_install_prompted", { platform: navigator.userAgent });
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  // Optional focus trap while the banner is visible.
  useEffect(() => {
    if (!visible) return;

    const container = containerRef.current;
    if (!container) return;

    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      )
    );

    if (focusable.length === 0) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    focusable[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [visible]);

  async function handleInstall() {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    const outcome = choice.outcome;

    logPwaEvent(
      outcome === "accepted" ? "pwa_install_completed" : "pwa_install_prompt_dismissed",
      { outcome, platform: choice.platform }
    );

    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setDismissed();
    setVisible(false);
    logPwaEvent("pwa_install_prompt_dismissed", { trigger: "later_button" });
  }

  function handleClose() {
    setDismissed();
    setVisible(false);
    logPwaEvent("pwa_install_prompt_dismissed", { trigger: "close_button" });
  }

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      role="banner"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Añade Rhynode a tu pantalla principal"
      className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 lg:hidden sm:max-w-sm sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-xl ring-1 ring-black/5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <TrendingUp className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Añade Rhynode a tu pantalla principal
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Accede en segundos como una app, sin buscar en el navegador.
              </p>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={handleClose}
              aria-label="Cerrar aviso de instalación"
              className="shrink-0 -mr-1 -mt-1"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleInstall}
              className="h-9 px-4 text-sm"
            >
              Instalar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              aria-label="Recordarme más tarde"
              className="h-9 px-3 text-sm"
            >
              Más tarde
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
