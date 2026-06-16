
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, Loader2 } from "lucide-react";

interface NotificationPreferences {
  budgets: boolean;
  subscriptions: boolean;
  weeklySummary: boolean;
}

interface NotificationsSectionProps {
  prefs: NotificationPreferences;
  loading: boolean;
  saving: boolean;
  pushEnabled: boolean;
  pushLoading: boolean;
  onChange: (key: keyof NotificationPreferences, value: boolean) => void;
  onEnablePush: () => void;
}

export function NotificationsSection({
  prefs,
  loading,
  saving,
  pushEnabled,
  pushLoading,
  onChange,
  onEnablePush,
}: NotificationsSectionProps) {
  return (
    <Card className="surface-elevated-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="heading-card flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notificaciones
        </CardTitle>
        <Button type="submit" disabled={saving} size="sm" className="hidden sm:inline-flex">
          Guardar Cambios
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-6 w-full rounded-md bg-muted animate-pulse" />
            <div className="h-6 w-full rounded-md bg-muted animate-pulse" />
            <div className="h-6 w-full rounded-md bg-muted animate-pulse" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium" id="notif-budgets-title">Presupuestos</div>
                <div className="text-sm text-muted-foreground" id="notif-budgets-desc">
                  Recibe alertas cuando gastes más del 80% de un presupuesto
                </div>
              </div>
              <Switch
                checked={prefs.budgets}
                onCheckedChange={(v) => onChange("budgets", v)}
                disabled={saving}
                aria-labelledby="notif-budgets-title notif-budgets-desc"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium" id="notif-subscriptions-title">Suscripciones</div>
                <div className="text-sm text-muted-foreground" id="notif-subscriptions-desc">
                  Recordatorios antes de que venzan tus suscripciones
                </div>
              </div>
              <Switch
                checked={prefs.subscriptions}
                onCheckedChange={(v) => onChange("subscriptions", v)}
                disabled={saving}
                aria-labelledby="notif-subscriptions-title notif-subscriptions-desc"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium" id="notif-weekly-title">Resumen Semanal</div>
                <div className="text-sm text-muted-foreground" id="notif-weekly-desc">
                  Recibe un resumen de tus finanzas cada semana
                </div>
              </div>
              <Switch
                checked={prefs.weeklySummary}
                onCheckedChange={(v) => onChange("weeklySummary", v)}
                disabled={saving}
                aria-labelledby="notif-weekly-title notif-weekly-desc"
              />
            </div>
          </>
        )}

        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <div className="font-medium">Notificaciones Push</div>
            <div className="text-sm text-muted-foreground">
              {pushEnabled ? "Activado en este dispositivo" : "Desactivado"}
            </div>
          </div>
          <Button
            variant={pushEnabled ? "outline" : "default"}
            size="sm"
            onClick={onEnablePush}
            disabled={pushLoading || pushEnabled}
            aria-label={pushEnabled ? "Notificaciones push activadas" : "Activar notificaciones push"}
          >
            {pushLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : pushEnabled ? (
              "Activado"
            ) : (
              "Activar"
            )}
          </Button>
        </div>
        <Button type="submit" disabled={saving} className="w-full sm:hidden">
          Guardar Cambios
        </Button>
      </CardContent>
    </Card>
  );
}
