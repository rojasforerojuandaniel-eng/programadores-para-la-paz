
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Building2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface Organization {
  name: string;
  taxId: string;
  country: string;
  currency: string;
  timezone: string;
}

interface CompanySectionProps {
  org: Organization;
  onChange: (org: Organization) => void;
  saving: boolean;
}

export function CompanySection({ org, onChange, saving }: CompanySectionProps) {
  const t = useTranslations("dashboard.settings");

  return (
    <Card className="surface-elevated-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="heading-card flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          {t("company.title")}
        </CardTitle>
        <Button type="submit" disabled={saving} size="sm" className="hidden sm:inline-flex">
          {t("saveChanges")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="org-name">{t("company.name")}</Label>
            <Input
              id="org-name"
              value={org.name}
              onChange={(e) => onChange({ ...org, name: e.target.value })}
              placeholder={t("company.namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-taxId">{t("company.taxId")}</Label>
            <Input
              id="org-taxId"
              value={org.taxId || ""}
              onChange={(e) => onChange({ ...org, taxId: e.target.value })}
              placeholder={t("company.taxIdPlaceholder")}
            />
          </div>
        </div>
        <Button type="submit" disabled={saving} className="w-full sm:hidden">
          {t("saveChanges")}
        </Button>
      </CardContent>
    </Card>
  );
}
