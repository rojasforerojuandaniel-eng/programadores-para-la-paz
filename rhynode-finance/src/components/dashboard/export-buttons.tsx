"use client";

import { Button } from "@/components/ui/button";
import { FileText, Sheet, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      toast.error("Error al generar el archivo");
      return;
    }
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  } catch {
    toast.error("Error de red al descargar");
  }
}

interface ExportButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  shortLabel: string;
}

function ExportButton({ onClick, icon, label, shortLabel }: ExportButtonProps) {
  return (
    <Button variant="outline" className="h-10 shrink-0 gap-2" onClick={onClick}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{shortLabel}</span>
    </Button>
  );
}

export function ExportButtons() {
  return (
    <div className="flex flex-row gap-2 overflow-x-auto pb-1">
      <ExportButton
        onClick={() => downloadFile("/api/reports/pdf", "transacciones.pdf")}
        icon={<FileText className="h-4 w-4" />}
        label="Exportar PDF"
        shortLabel="PDF"
      />
      <ExportButton
        onClick={() => downloadFile("/api/reports/excel", "transacciones.xlsx")}
        icon={<Sheet className="h-4 w-4" />}
        label="Exportar Excel"
        shortLabel="Excel"
      />
      <ExportButton
        onClick={() => downloadFile("/api/reports/csv", "transacciones.csv")}
        icon={<FileSpreadsheet className="h-4 w-4" />}
        label="Exportar CSV"
        shortLabel="CSV"
      />
    </div>
  );
}
