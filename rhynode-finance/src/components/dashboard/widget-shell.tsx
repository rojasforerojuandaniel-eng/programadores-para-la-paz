"use client";

import { useState, useEffect, type ReactNode } from "react";
import { loadWidgetVisibility } from "./widget-settings";

interface WidgetShellProps {
  widgetId: string;
  children: ReactNode;
}

export function WidgetShell({ widgetId, children }: WidgetShellProps) {
  const [visible, setVisible] = useState(() => loadWidgetVisibility()[widgetId] !== false);

  useEffect(() => {
    function handleChange() {
      setVisible(loadWidgetVisibility()[widgetId] !== false);
    }
    handleChange();
    window.addEventListener("widget-settings-changed", handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener("widget-settings-changed", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, [widgetId]);

  if (!visible) return null;
  return <>{children}</>;
}
