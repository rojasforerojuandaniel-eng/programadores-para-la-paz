"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function DashboardError({
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
      title="Algo salió mal en el dashboard"
      description="No pudimos cargar esta sección. Intenta de nuevo o selecciona otra opción en el menú."
      fullScreen={false}
      context="dashboard-error-boundary"
    />
  );
}
