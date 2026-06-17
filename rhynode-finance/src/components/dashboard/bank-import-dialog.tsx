"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  BankImportPreview,
  type BankAccount,
  type RowState,
} from "@/components/dashboard/bank-import-preview";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { COMMON_CATEGORIES } from "@/components/dashboard/transaction-form";
import type { ParsedBankRow } from "@/lib/bank-import";

interface PreviewResponse {
  preview: {
    rows: (ParsedBankRow & { suggestedCategory?: string })[];
    duplicateCount: number;
    totalRows: number;
    parsedRows: number;
    headers: string[];
    mapping: Record<string, string | undefined>;
  };
}

interface BankImportDialogProps {
  bankAccounts: BankAccount[];
  onImport: () => void;
  children?: React.ReactNode;
}

export function BankImportDialog({
  bankAccounts,
  onImport,
  children,
}: BankImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse["preview"] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [defaultAccountId, setDefaultAccountId] = useState("");
  const [defaultCategory, setDefaultCategory] = useState("");

  const reset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setRowState({});
    setDefaultAccountId("");
    setDefaultCategory("");
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) reset();
    },
    [reset]
  );

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setPreview(null);
    setRowState({});
  }, []);

  const handlePreview = useCallback(async () => {
    if (!file) return;
    setPreviewLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/transactions/import", { method: "POST", body: formData });
      const data = (await res.json()) as PreviewResponse & { error?: string };

      if (!res.ok) {
        toast.error(data.error || "Error al leer el archivo");
        setPreview(null);
        return;
      }

      const preview = data.preview;
      setPreview(preview);

      const initialState: Record<string, RowState> = {};
      const accountId = bankAccounts[0]?.id ?? "";
      for (const row of preview.rows) {
        initialState[row.id] = {
          selected: !row.duplicate,
          bankAccountId: accountId,
          category: row.suggestedCategory || defaultCategory || "",
        };
      }
      setRowState(initialState);
      if (bankAccounts.length === 1) setDefaultAccountId(accountId);
    } catch {
      toast.error("Error de red al procesar el archivo");
    } finally {
      setPreviewLoading(false);
    }
  }, [file, bankAccounts, defaultCategory]);

  const handleApplyDefaults = useCallback(() => {
    setRowState((prev) => {
      const next = { ...prev };
      for (const [id, state] of Object.entries(next)) {
        next[id] = {
          ...state,
          bankAccountId: defaultAccountId || state.bankAccountId,
          category: defaultCategory || state.category,
        };
      }
      return next;
    });
  }, [defaultAccountId, defaultCategory]);

  const toggleAll = useCallback(
    (checked: boolean) => {
      if (!preview) return;
      setRowState((prev) => {
        const next = { ...prev };
        for (const row of preview.rows) {
          const state = next[row.id];
          if (state) next[row.id] = { ...state, selected: checked };
        }
        return next;
      });
    },
    [preview]
  );

  const selectedRows = useMemo(() => {
    if (!preview) return [];
    return preview.rows.filter((row) => rowState[row.id]?.selected);
  }, [preview, rowState]);

  const handleImport = useCallback(async () => {
    if (!preview || selectedRows.length === 0) return;
    setImportLoading(true);
    try {
      const transactions = selectedRows.map((row) => ({
        date: row.date,
        description: row.description,
        amount: row.amount,
        type: row.type,
        bankAccountId: rowState[row.id]?.bankAccountId || undefined,
        category: rowState[row.id]?.category || undefined,
        categoryId: rowState[row.id]?.categoryId || undefined,
      }));

      const res = await fetch("/api/transactions/import", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions }),
      });

      const data = (await res.json()) as { success?: boolean; imported?: number; error?: string };

      if (!res.ok) {
        toast.error(data.error || "Error al importar transacciones");
        return;
      }

      trackEvent("bank_import_confirmed", {
        count: data.imported ?? selectedRows.length,
      });
      toast.success(`${data.imported ?? selectedRows.length} transacciones importadas`);
      setOpen(false);
      reset();
      onImport();
    } catch {
      toast.error("Error de red al importar");
    } finally {
      setImportLoading(false);
    }
  }, [preview, selectedRows, rowState, onImport, reset]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Importar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar movimientos bancarios</DialogTitle>
          <DialogDescription>
            Sube un extracto CSV o Excel. Detectaremos columnas, duplicados y te permitiremos
            revisar antes de importar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="bank-file">Archivo bancario</Label>
              <Input
                id="bank-file"
                type="file"
                accept=".csv,.xlsx,.xls,.ods"
                onChange={handleFileChange}
                disabled={previewLoading}
              />
              <p className="text-xs text-muted-foreground">
                Formatos: CSV, Excel (.xlsx, .xls) u ODS. Máximo 2MB.
              </p>
            </div>
            <Button
              onClick={handlePreview}
              disabled={!file || previewLoading}
              className="gap-2"
            >
              {previewLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              {previewLoading ? "Leyendo..." : "Vista previa"}
            </Button>
          </div>

          {preview && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Badge variant="secondary">{preview.parsedRows} filas válidas</Badge>
                {preview.duplicateCount > 0 && (
                  <Badge variant="destructive">
                    {preview.duplicateCount} posibles duplicados
                  </Badge>
                )}
                <span className="text-muted-foreground">
                  {file?.name} ({preview.headers.length} columnas)
                </span>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Cuenta por defecto</Label>
                  <Select value={defaultAccountId} onValueChange={setDefaultAccountId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona cuenta..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.length === 0 && (
                        <SelectItem value="_none" disabled>No hay cuentas</SelectItem>
                      )}
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.bankName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Categoría por defecto</Label>
                  <Select value={defaultCategory} onValueChange={setDefaultCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona categoría..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_CATEGORIES.map((cat: string) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleApplyDefaults}
                  disabled={!defaultAccountId && !defaultCategory}
                >
                  Aplicar a seleccionadas
                </Button>
              </div>

              <BankImportPreview
                rows={preview.rows}
                bankAccounts={bankAccounts}
                rowState={rowState}
                setRowState={setRowState}
                selectedRows={selectedRows}
                toggleAll={toggleAll}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          {preview && (
            <Button
              onClick={handleImport}
              disabled={selectedRows.length === 0 || importLoading}
              className="gap-2"
            >
              {importLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Importar {selectedRows.length} seleccionadas
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BankImportButton({
  bankAccounts,
  onImport,
}: {
  bankAccounts: BankAccount[];
  onImport: () => void;
}) {
  return (
    <BankImportDialog bankAccounts={bankAccounts} onImport={onImport}>
      <Button variant="outline" className="gap-2">
        <Upload className="h-4 w-4" />
        Importar
      </Button>
    </BankImportDialog>
  );
}

export function BankImportRefreshButton({
  bankAccounts,
}: {
  bankAccounts: BankAccount[];
}) {
  const router = useRouter();
  return <BankImportDialog bankAccounts={bankAccounts} onImport={() => router.refresh()} />;
}
