"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Lock,
  KeyRound,
  AlertCircle,
  Database,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

type ExportFormat = "json" | "xlsx";

export function SecuritySection() {
  const [format, setFormat] = useState<ExportFormat>("json");
  const [isExporting, setIsExporting] = useState(false);
  const t = useTranslations("dashboard.settings");

  async function handleExport() {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/organization/export?format=${format}`);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="?([^";]+)"?/);
      link.download = filenameMatch?.[1] ?? `rhynode-export.${format}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t("security.data.exportError"));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t("security.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="body-default">
            {t("security.description")}
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Lock className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <div className="font-medium">{t("security.password.title")}</div>
                <div className="text-sm text-muted-foreground">
                  {t("security.password.description")}
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <KeyRound className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <div className="font-medium">{t("security.twoFactor.title")}</div>
                <div className="text-sm text-muted-foreground">
                  {t("security.twoFactor.description")}
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <div className="font-medium">{t("security.sessions.title")}</div>
                <div className="text-sm text-muted-foreground">
                  {t("security.sessions.description")}
                </div>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {t("security.data.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="body-default">
            {t("security.data.description")}
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <label htmlFor="export-format" className="text-sm font-medium">
                {t("security.data.format")}
              </label>
              <Select
                value={format}
                onValueChange={(value) => setFormat(value as ExportFormat)}
              >
                <SelectTrigger id="export-format" className="w-40">
                  <SelectValue placeholder={t("security.data.formatPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="w-full sm:w-auto"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isExporting ? t("security.data.generating") : t("security.data.export")}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("security.data.disclaimer")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
