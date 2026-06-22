"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate as fmtDate } from "@/lib/format";
import type { Locale } from "@/lib/locale";
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
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  FileUp,
  Download,
  Trash2,
  AlertCircle,
  Check,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const CSV_TEMPLATE_ROWS = [
  ["Fecha", "Descripcion", "Debito", "Credito", "Categoria"],
  ["2026-01-15", "Pago de nomina", "", "2500000", "Nómina"],
  ["2026-01-16", "Supermercado exito", "180000", "", "Mercado"],
  ["2026-01-17", "Transporte uber", "24000", "", "Transporte / Delivery"],
];

const MAX_FILE_SIZE = 2 * 1024 * 1024;

function isValidImportFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  const validExtensions = [".csv", ".xlsx", ".xls", ".ods"];
  return validExtensions.some((ext) => lowerName.endsWith(ext));
}

function downloadCsvTemplate() {
  const csv = CSV_TEMPLATE_ROWS.map((row) => row.join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "plantilla-transacciones-rhynode.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function BankImportDialog({
  bankAccounts,
  onImport,
  children,
}: BankImportDialogProps) {
  const t = useTranslations("dashboard.accounts");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse["preview"] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [defaultAccountId, setDefaultAccountId] = useState("");
  const [defaultCategory, setDefaultCategory] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setRowState({});
    setDefaultAccountId("");
    setDefaultCategory("");
    setIsDragging(false);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) reset();
    },
    [reset]
  );

  const handleFile = useCallback((selected: File | null) => {
    if (!selected) {
      setFile(null);
      setPreview(null);
      setRowState({});
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      toast.error(t("bankImport.toastFileTooLarge"));
      return;
    }
    if (!isValidImportFile(selected)) {
      toast.error(t("bankImport.toastUnsupportedFormat"));
      return;
    }
    setFile(selected);
    setPreview(null);
    setRowState({});
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(event.target.files?.[0] ?? null);
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      const dropped = event.dataTransfer.files?.[0] ?? null;
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
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
        toast.error(data.error || t("bankImport.toastReadError"));
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
      toast.error(t("bankImport.toastNetworkError"));
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

  const previewTopRows = useMemo(() => {
    if (!preview) return [];
    return preview.rows.slice(0, 10);
  }, [preview]);

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
        toast.error(data.error || t("bankImport.toastImportError"));
        return;
      }

      trackEvent("bank_import_confirmed", {
        count: data.imported ?? selectedRows.length,
      });
      toast.success(t("bankImport.toastImported", { count: data.imported ?? selectedRows.length }));
      setOpen(false);
      reset();
      onImport();
    } catch {
      toast.error(t("bankImport.toastImportNetworkError"));
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
            {t("bankImport.importButton")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("bankImport.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("bankImport.dialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex-1 space-y-2">
              <Label htmlFor="bank-file">{t("bankImport.fileLabel")}</Label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:border-primary",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/30 bg-muted/30 hover:bg-muted/50"
                )}
              >
                <Input
                  id="bank-file"
                  type="file"
                  accept=".csv,.xlsx,.xls,.ods"
                  onChange={handleFileChange}
                  disabled={previewLoading}
                  className={cn(
                    "absolute inset-0 h-full w-full cursor-pointer opacity-0",
                    file && "pointer-events-none"
                  )}
                  aria-label={t("bankImport.fileAriaLabel")}
                />
                {file ? (
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                    <div className="text-center">
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("bankImport.fileReplaceHint")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFile(null);
                      }}
                      aria-label={t("bankImport.removeFileAria")}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <FileUp className={cn("h-8 w-8", isDragging ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        {t("bankImport.dropHint")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("bankImport.formatsHint")}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadCsvTemplate}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {t("bankImport.downloadTemplate")}
              </Button>
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
                {previewLoading ? t("bankImport.reading") : t("bankImport.preview")}
              </Button>
            </div>
          </div>

          {preview && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <Badge variant="secondary">{t("bankImport.validRows", { count: preview.parsedRows })}</Badge>
                {preview.duplicateCount > 0 && (
                  <Badge variant="destructive">
                    {t("bankImport.possibleDuplicates", { count: preview.duplicateCount })}
                  </Badge>
                )}
                <span className="text-muted-foreground">
                  {file?.name} {t("bankImport.columnsSuffix", { count: preview.headers.length })}
                </span>
              </div>

              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-medium">{t("bankImport.mappingPreviewTitle")}</h4>
                  {preview.rows.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      {t("bankImport.showing", { total: preview.rows.length })}
                    </Badge>
                  )}
                </div>
                <div className="hidden overflow-x-auto rounded-xl border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>{t("bankImport.table.date")}</TableHead>
                        <TableHead>{t("bankImport.table.description")}</TableHead>
                        <TableHead>{t("bankImport.table.amount")}</TableHead>
                        <TableHead>{t("table.type")}</TableHead>
                        <TableHead>{t("bankImport.table.suggestedCategory")}</TableHead>
                        <TableHead className="text-right">{t("bankImport.table.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewTopRows.map((row) => (
                        <TableRow
                          key={row.id}
                          className={cn(row.duplicate && "bg-destructive/5")}
                        >
                          <TableCell className="whitespace-nowrap text-sm">
                            {fmtDate(row.date, locale)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm">{row.description}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm font-medium">
                            {formatCurrency(row.amount, "COP", locale)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                row.type === "INCOME"
                                  ? "bg-success/10 text-success"
                                  : "bg-danger/10 text-danger"
                              )}
                            >
                              {row.type === "INCOME" ? t("bankImport.income") : t("bankImport.expense")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.suggestedCategory || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.duplicate ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {t("bankImport.duplicate")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-success">
                                <Check className="h-3 w-3" />
                                {t("bankImport.new")}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <ul className="grid gap-3 md:hidden" role="list">
                  {previewTopRows.map((row) => (
                    <li
                      key={row.id}
                      className={cn(
                        "surface-elevated-2 rounded-xl p-4",
                        row.duplicate && "border-destructive/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{row.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {fmtDate(row.date, locale)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={cn(
                              "font-semibold",
                              row.type === "INCOME" ? "text-success" : "text-danger"
                            )}
                          >
                            {formatCurrency(row.amount, "COP", locale)}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              row.type === "INCOME"
                                ? "bg-success/10 text-success"
                                : "bg-danger/10 text-danger"
                            )}
                          >
                            {row.type === "INCOME" ? t("bankImport.income") : t("bankImport.expense")}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {t("bankImport.catPrefix", { value: row.suggestedCategory || "—" })}
                        </span>
                        {row.duplicate ? (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            {t("bankImport.duplicate")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs text-success">
                            <Check className="h-3 w-3" />
                            {t("bankImport.new")}
                          </Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="default-account" className="text-xs">{t("bankImport.defaultAccount")}</Label>
                  <Select value={defaultAccountId} onValueChange={setDefaultAccountId}>
                    <SelectTrigger id="default-account" className="w-full">
                      <SelectValue placeholder={t("bankImport.selectAccountPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.length === 0 && (
                        <SelectItem value="_none" disabled>{t("bankImport.noAccounts")}</SelectItem>
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
                  <Label htmlFor="default-category" className="text-xs">{t("bankImport.defaultCategory")}</Label>
                  <Select value={defaultCategory} onValueChange={setDefaultCategory}>
                    <SelectTrigger id="default-category" className="w-full">
                      <SelectValue placeholder={t("bankImport.selectCategoryPlaceholder")} />
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
                  {t("bankImport.applyToSelected")}
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
            {t("bankImport.cancel")}
          </Button>
          {preview && (
            <Button
              onClick={handleImport}
              disabled={selectedRows.length === 0 || importLoading}
              className="gap-2"
            >
              {importLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("bankImport.importSelected", { count: selectedRows.length })}
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
  const t = useTranslations("dashboard.accounts");
  return (
    <BankImportDialog bankAccounts={bankAccounts} onImport={onImport}>
      <Button variant="outline" className="gap-2">
        <Upload className="h-4 w-4" />
        {t("bankImport.importButton")}
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
