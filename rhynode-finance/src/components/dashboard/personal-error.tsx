"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function PersonalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <p className="text-muted-foreground max-w-md">{t("description")}</p>
      </div>
      <Button onClick={reset} aria-label={t("retryAriaLabel")}>
        {t("retry")}
      </Button>
    </div>
  );
}
