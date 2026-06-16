"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor } from "lucide-react";
import { useIsClient } from "@/hooks/use-is-client";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useIsClient();

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Cambiar tema" disabled>
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const current = resolvedTheme || theme || "dark";

  function cycleTheme() {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }

  const Icon = current === "dark" ? Moon : Sun;
  const label = current === "dark" ? "Modo oscuro" : current === "light" ? "Modo claro" : "Tema del sistema";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={cycleTheme}
    >
      {theme === "system" ? (
        <Monitor className="h-5 w-5" />
      ) : (
        <Icon className="h-5 w-5" />
      )}
    </Button>
  );
}
