"use client";

import { useTranslations } from "next-intl";
import { ErrorFallback } from "@/components/error-fallback";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("dashboard.error");
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title={t("title")}
      description={t("description")}
      fullScreen={false}
      context="dashboard-error-boundary"
    />
  );
}
