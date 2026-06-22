"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useIsClient } from "@/hooks/use-is-client";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const t = useTranslations("theme");
  const mounted = useIsClient();

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label={t("toggle")} disabled>
        <Sun className="h-5 w-5" aria-hidden="true" />
      </Button>
    );
  }

  const isDark = (resolvedTheme || theme) === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? t("toLight") : t("toDark")}
      title={isDark ? t("toLight") : t("toDark")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Moon className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Sun className="h-5 w-5" aria-hidden="true" />
      )}
    </Button>
  );
}