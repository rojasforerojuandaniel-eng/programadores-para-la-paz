"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Root error boundary caught error", {
      message: error.message,
      digest: error.digest,
    });
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <h1 className="text-2xl font-semibold">Algo salió mal</h1>
      <p className="text-muted-foreground">
        {error.message || "Ocurrió un error inesperado. Intenta de nuevo."}
      </p>
      <Button onClick={reset}>Intentar de nuevo</Button>
    </div>
  );
}
