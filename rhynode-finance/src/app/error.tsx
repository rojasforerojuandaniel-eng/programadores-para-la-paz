"use client";

import { NextIntlClientProvider, useTranslations } from "next-intl";
import { ErrorFallback } from "@/components/error-fallback";
import { getLocaleClient } from "@/lib/locale";
import { useIsClient } from "@/hooks/use-is-client";
import esMessages from "../../messages/es.json";
import enMessages from "../../messages/en.json";

function RootErrorInner({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title={t("title")}
      description={t("rootDescription")}
      fullScreen
      context="root-error-boundary"
    />
  );
}

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const mounted = useIsClient();
  if (!mounted) return null;
  const locale = getLocaleClient();
  const messages = locale === "en" ? enMessages : esMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <RootErrorInner error={error} reset={reset} />
    </NextIntlClientProvider>
  );
}