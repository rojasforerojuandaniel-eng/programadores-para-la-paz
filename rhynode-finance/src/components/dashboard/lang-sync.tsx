"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/locale";

/**
 * Keeps <html lang> in sync with the dashboard locale (read from the cookie on
 * the server, passed down). The root layout defaults to "es".
 */
export function DashboardLangSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}