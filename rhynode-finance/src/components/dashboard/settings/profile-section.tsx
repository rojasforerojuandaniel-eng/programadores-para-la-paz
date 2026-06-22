
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Palette, Sun, Moon, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProfileSectionProps {
  theme?: string;
  mounted: boolean;
  onThemeChange: (value: string) => void;
  saving: boolean;
}

export function ProfileSection({
  theme,
  mounted,
  onThemeChange,
  saving,
}: ProfileSectionProps) {
  const t = useTranslations("dashboard.settings");

  return (
    <Card className="surface-elevated-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="heading-card flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          {t("profile.title")}
        </CardTitle>
        <Button type="submit" disabled={saving} size="sm" className="hidden sm:inline-flex">
          {t("saveChanges")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="settings-theme">{t("profile.theme")}</Label>
          {mounted ? (
            <Select value={theme || "dark"} onValueChange={onThemeChange}>
              <SelectTrigger id="settings-theme" className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <span className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    {t("profile.themeLight")}
                  </span>
                </SelectItem>
                <SelectItem value="dark">
                  <span className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    {t("profile.themeDark")}
                  </span>
                </SelectItem>
                <SelectItem value="system">
                  <span className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    {t("profile.themeSystem")}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="h-9 w-full sm:w-72 rounded-md border border-input bg-muted animate-pulse" />
          )}
        </div>
        <Button type="submit" disabled={saving} className="w-full sm:hidden">
          {t("saveChanges")}
        </Button>
      </CardContent>
    </Card>
  );
}
