
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
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";

interface Organization {
  name: string;
  taxId: string;
  country: string;
  currency: string;
  timezone: string;
}

interface LocalizationSectionProps {
  org: Organization;
  onChange: (org: Organization) => void;
  saving: boolean;
}

const countryCodes = ["CO", "MX", "BR", "AR", "CL", "PE"] as const;
const currencyCodes = ["COP", "MXN", "BRL", "ARS", "CLP", "PEN", "USD"] as const;
const timezoneValues = [
  "America/Bogota",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "America/Lima",
] as const;

export function LocalizationSection({
  org,
  onChange,
  saving,
}: LocalizationSectionProps) {
  const t = useTranslations("dashboard.settings");

  return (
    <Card className="surface-elevated-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="heading-card flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          {t("localization.title")}
        </CardTitle>
        <Button type="submit" disabled={saving} size="sm" className="hidden sm:inline-flex">
          {t("saveChanges")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="settings-country">{t("localization.country")}</Label>
            <Select
              value={org.country}
              onValueChange={(v) => onChange({ ...org, country: v })}
            >
              <SelectTrigger id="settings-country">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {countryCodes.map((code) => (
                  <SelectItem key={code} value={code}>
                    {t(`localization.countries.${code}` as never)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-currency">{t("localization.currency")}</Label>
            <Select
              value={org.currency}
              onValueChange={(v) => onChange({ ...org, currency: v })}
            >
              <SelectTrigger id="settings-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencyCodes.map((code) => (
                  <SelectItem key={code} value={code}>
                    {t(`localization.currencies.${code}` as never)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-timezone">{t("localization.timezone")}</Label>
            <Select
              value={org.timezone}
              onValueChange={(v) => onChange({ ...org, timezone: v })}
            >
              <SelectTrigger id="settings-timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezoneValues.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {t(`localization.timezones.${tz}` as never)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit" disabled={saving} className="w-full sm:hidden">
          {t("saveChanges")}
        </Button>
      </CardContent>
    </Card>
  );
}
