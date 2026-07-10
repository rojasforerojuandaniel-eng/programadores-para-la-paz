"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Sheet, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

async function downloadFile(
  url: string,
  filename: string,
  errorGenerate: string,
  networkError: string
) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      toast.error(errorGenerate);
      return;
    }
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } catch {
    toast.error(networkError);
  }
}

export function ExportButtons() {
  const t = useTranslations("dashboard.transactions");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">{t("export.label")}</span>
          <span className="sm:hidden">{t("export.label")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() =>
            downloadFile(
              "/api/reports/csv",
              "transacciones.csv",
              t("export.errorGenerate"),
              t("export.networkError")
            )
          }
        >
          <FileSpreadsheet className="h-4 w-4" />
          {t("export.csv")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            downloadFile(
              "/api/reports/excel",
              "transacciones.xlsx",
              t("export.errorGenerate"),
              t("export.networkError")
            )
          }
        >
          <Sheet className="h-4 w-4" />
          {t("export.excel")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            downloadFile(
              "/api/reports/pdf",
              "transacciones.pdf",
              t("export.errorGenerate"),
              t("export.networkError")
            )
          }
        >
          <FileText className="h-4 w-4" />
          {t("export.pdf")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
