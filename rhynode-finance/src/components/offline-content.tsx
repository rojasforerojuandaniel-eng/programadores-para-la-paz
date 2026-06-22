"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { CheckCircle2, LayoutDashboard, RefreshCw, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const OFFLINE_FEATURE_KEYS = [
  "feature1",
  "feature2",
  "feature3",
  "feature4",
] as const;

export function OfflineContent() {
  const t = useTranslations("offline");
  const [isRetrying, setIsRetrying] = useState(false);

  const handleReload = useCallback(() => {
    setIsRetrying(true);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo href="/" size="lg" />
        </div>

        <section className="flex flex-col items-center rounded-2xl border bg-card p-8 text-center shadow-sm sm:p-10">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-warning/10 text-warning">
            <WifiOff className="h-10 w-10" aria-hidden="true" />
          </div>

          <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {t("heading")}
          </h1>
          <p className="mb-6 max-w-xs text-muted-foreground">
            {t("body")}
          </p>

          <div className="mb-8 w-full rounded-xl bg-muted p-4 text-left">
            <p className="mb-3 text-sm font-medium text-foreground">
              {t("stillCanTitle")}
            </p>
            <ul className="space-y-2">
              {OFFLINE_FEATURE_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <div aria-live="polite" className="contents">
            <Button
              onClick={handleReload}
              disabled={isRetrying}
              aria-busy={isRetrying}
              size="lg"
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} aria-hidden="true" />
              {isRetrying ? t("retrying") : t("retry")}
            </Button>
            </div>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                {t("goDashboard")}
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}