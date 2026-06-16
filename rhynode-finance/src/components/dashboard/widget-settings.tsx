"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, GripVertical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export interface WidgetConfig {
  id: string;
  label: string;
  defaultVisible: boolean;
}

export const AVAILABLE_WIDGETS: WidgetConfig[] = [
  { id: "kpi-grid", label: "KPI Grid", defaultVisible: true },
  { id: "xp-bar", label: "XP Bar", defaultVisible: true },
  { id: "health-score", label: "Health Score", defaultVisible: true },
  { id: "left-widget", label: "Left Widget (transacciones/facturas)", defaultVisible: true },
  { id: "right-widget", label: "Right Widget (presupuestos/vencimientos)", defaultVisible: true },
  { id: "ant-expenses", label: "Ant Expenses", defaultVisible: true },
  { id: "anomalies", label: "Anomalies", defaultVisible: true },
  { id: "recent-events", label: "Recent Events (proximos eventos)", defaultVisible: true },
];

const STORAGE_KEY = "rhynode-dashboard-widgets";

export function getDefaultVisibility(): Record<string, boolean> {
  const defaults: Record<string, boolean> = {};
  for (const w of AVAILABLE_WIDGETS) {
    defaults[w.id] = w.defaultVisible;
  }
  return defaults;
}

export function loadWidgetVisibility(): Record<string, boolean> {
  if (typeof window === "undefined") return getDefaultVisibility();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultVisibility();
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    const merged = getDefaultVisibility();
    for (const key of Object.keys(parsed)) {
      if (merged[key] !== undefined) merged[key] = parsed[key];
    }
    return merged;
  } catch {
    return getDefaultVisibility();
  }
}

export function saveWidgetVisibility(config: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function isWidgetVisible(id: string): boolean {
  return loadWidgetVisibility()[id] !== false;
}

export function WidgetSettings() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<Record<string, boolean>>(() =>
    loadWidgetVisibility()
  );

  useEffect(() => {
    saveWidgetVisibility(config);
    window.dispatchEvent(new Event("widget-settings-changed"));
  }, [config]);

  const toggleWidget = useCallback((id: string) => {
    setConfig((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleReset = useCallback(() => {
    setConfig(getDefaultVisibility());
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Widgets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-card">Personalizar Widgets</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-3">
            {AVAILABLE_WIDGETS.map((widget) => (
              <div
                key={widget.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  id={`widget-${widget.id}`}
                  type="checkbox"
                  checked={!!config[widget.id]}
                  onChange={() => toggleWidget(widget.id)}
                  className="h-4 w-4 shrink-0 rounded border border-input bg-background text-primary accent-primary ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                />
                <Label
                  htmlFor={`widget-${widget.id}`}
                  className="flex-1 cursor-pointer text-sm font-medium"
                >
                  {widget.label}
                </Label>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar defaults
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
