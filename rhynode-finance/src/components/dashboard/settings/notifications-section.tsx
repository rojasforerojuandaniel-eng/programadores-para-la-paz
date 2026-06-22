"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("dashboard.settings");

  return (
    <Card className="surface-elevated-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="heading-card flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          {t("notifications.title")}
        </CardTitle>
        <Button type="submit" disabled={saving} size="sm" className="hidden sm:inline-flex">
          {t("saveChanges")}
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
                <div className="font-medium" id="notif-budgets-title">{t("notifications.budgets.title")}</div>
                <div className="text-sm text-muted-foreground" id="notif-budgets-desc">
                  {t("notifications.budgets.desc")}
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
                <div className="font-medium" id="notif-subscriptions-title">{t("notifications.subscriptions.title")}</div>
                <div className="text-sm text-muted-foreground" id="notif-subscriptions-desc">
                  {t("notifications.subscriptions.desc")}
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
                <div className="font-medium" id="notif-weekly-title">{t("notifications.weekly.title")}</div>
                <div className="text-sm text-muted-foreground" id="notif-weekly-desc">
                  {t("notifications.weekly.desc")}
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
            <div className="font-medium">{t("notifications.push.title")}</div>
            <div className="text-sm text-muted-foreground">
              {pushEnabled ? t("notifications.push.enabled") : t("notifications.push.disabled")}
            </div>
          </div>
          <Button
            variant={pushEnabled ? "outline" : "default"}
            size="sm"
            onClick={onEnablePush}
            disabled={pushLoading || pushEnabled}
            aria-label={pushEnabled ? t("notifications.push.enabledAria") : t("notifications.push.activateAria")}
          >
            {pushLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : pushEnabled ? (
              t("notifications.push.activated")
            ) : (
              t("notifications.push.activate")
            )}
          </Button>
        </div>
        <Button type="submit" disabled={saving} className="w-full sm:hidden">
          {t("saveChanges")}
        </Button>
      </CardContent>
    </Card>
  );
}