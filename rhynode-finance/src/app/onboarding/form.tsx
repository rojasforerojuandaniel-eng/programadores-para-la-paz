"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Globe, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const COUNTRY_CODES = ["CO", "MX", "BR", "AR", "CL", "PE"] as const;
const CURRENCIES = ["COP", "MXN", "BRL", "ARS", "CLP", "PEN", "USD"] as const;
const TIMEZONES = [
  "America/Bogota",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "America/Lima",
] as const;

export default function OnboardingForm() {
  const router = useRouter();
  const t = useTranslations("onboarding.flow");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    taxId: "",
    country: "CO",
    currency: "COP",
    timezone: "America/Bogota",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t("errors.requiredBusinessName"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, onboardingCompleted: true }),
      });

      if (res.ok) {
        toast.success(t("form.successToast"));
        router.push("/dashboard");
      } else if (res.status === 401) {
        toast.error(t("errors.sessionExpired"));
        router.push("/sign-in");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t("form.saveError"));
      }
    } catch {
      toast.error(t("errors.network"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mb-2 inline-flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">Rhynode</span>
          </div>
          <h1 className="heading-section mt-4">{t("form.title")}</h1>
          <p className="body-default mt-1 text-muted-foreground">{t("form.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="surface-elevated-2">
            <CardHeader>
              <CardTitle className="heading-card flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {t("form.basicTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">{t("businessData.nameLabel")} *</Label>
                <Input
                  id="org-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("businessData.namePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-taxId">{t("businessData.taxIdLabel")}</Label>
                <Input
                  id="org-taxId"
                  value={form.taxId}
                  onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                  placeholder={t("businessData.taxIdPlaceholder")}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated-2">
            <CardHeader>
              <CardTitle className="heading-card flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                {t("location.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="org-country">{t("location.countryLabel")}</Label>
                  <Select
                    value={form.country}
                    onValueChange={(v) => setForm({ ...form, country: v })}
                  >
                    <SelectTrigger id="org-country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {t(`countries.${code}` as never)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-currency">{t("location.currencyLabel")}</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(v) => setForm({ ...form, currency: v })}
                  >
                    <SelectTrigger id="org-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-timezone">{t("location.timezoneLabel")}</Label>
                  <Select
                    value={form.timezone}
                    onValueChange={(v) => setForm({ ...form, timezone: v })}
                  >
                    <SelectTrigger id="org-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((zone) => (
                        <SelectItem key={zone} value={zone}>
                          {t(`timezones.${zone}` as never)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={loading} className="w-full gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("actions.saving")}
              </>
            ) : (
              <>
                {t("actions.goDashboard")}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}