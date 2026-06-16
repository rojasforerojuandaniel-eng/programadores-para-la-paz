"use client";

import { Button } from "@/components/ui/button";
import { FileText, Sheet } from "lucide-react";
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

export function ExportButtons() {
  return (
    <>
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => downloadFile("/api/reports/pdf", "transacciones.pdf")}
      >
        <FileText className="h-4 w-4" />
        Exportar PDF
      </Button>
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => downloadFile("/api/reports/excel", "transacciones.xlsx")}
      >
        <Sheet className="h-4 w-4" />
        Exportar Excel
      </Button>
    </>
  );
}
