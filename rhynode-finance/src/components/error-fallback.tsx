"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
import { cn } from "@/lib/utils";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  fullScreen?: boolean;
  context?: string;
}

export function ErrorFallback({
  error,
  reset,
  title,
  description,
  fullScreen = true,
  context = "error-boundary",
}: ErrorFallbackProps) {
  const t = useTranslations("error");
  const resolvedTitle = title ?? t("title");
  const resolvedDescription = description ?? t("description");
  useEffect(() => {
    logger.error(`${context} caught error`, {
      message: error.message,
      digest: error.digest,
      name: error.name,
    });

    Sentry.captureException(error, {
      extra: {
        digest: error.digest,
        context,
      },
    });
  }, [error, context]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 bg-background px-4 py-12 text-center",
        fullScreen ? "min-h-screen" : "h-full w-full"
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="rounded-full bg-destructive/10 p-4 text-destructive">
        <AlertTriangle className="size-8" aria-hidden="true" />
      </div>

      <div className="max-w-md space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {resolvedTitle}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">{resolvedDescription}</p>
      </div>

      {isDev && (
        <div className="w-full max-w-md space-y-3 rounded-lg border border-border bg-card p-4 text-left shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("devDetails")}
            </p>
            <p className="break-words text-sm font-mono text-destructive">{error.message}</p>
          </div>
          {error.digest && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Digest
              </p>
              <p className="break-words text-sm font-mono text-muted-foreground">{error.digest}</p>
            </div>
          )}
        </div>
      )}

      <Button
        onClick={reset}
        className="mt-2 gap-2"
        aria-label={t("retryAriaLabel")}
      >
        <RefreshCw className="size-4" aria-hidden="true" />
        {t("retry")}
      </Button>
    </div>
  );
}
