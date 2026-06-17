"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Algo salió mal"
      description="Ocurrió un error inesperado en la aplicación. Intenta de nuevo o vuelve más tarde."
      fullScreen
      context="root-error-boundary"
    />
  );
}
