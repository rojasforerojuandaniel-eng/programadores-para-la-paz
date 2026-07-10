"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate as fmtDate } from "@/lib/format";
import type { Locale } from "@/lib/locale";
import {
  CATEGORY_KEYS,
  CATEGORY_I18N_KEYS,
} from "@/lib/transaction-categories";
import type { ParsedBankRow } from "@/lib/bank-import";

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
}

export interface RowState {
  selected: boolean;
  bankAccountId: string;
  category: string;
  categoryId?: string;
}

interface PreviewRow extends ParsedBankRow {
  suggestedCategory?: string;
}

interface BankImportPreviewProps {
  rows: PreviewRow[];
  bankAccounts: BankAccount[];
  rowState: Record<string, RowState>;
  setRowState: React.Dispatch<React.SetStateAction<Record<string, RowState>>>;
  selectedRows: PreviewRow[];
  toggleAll: (checked: boolean) => void;
}

export function BankImportPreview({
  rows,
  bankAccounts,
  rowState,
  setRowState,
  selectedRows,
  toggleAll,
}: BankImportPreviewProps) {
  const t = useTranslations("dashboard.accounts");
  const tCat = useTranslations("transactionCategories");
  const locale = useLocale() as Locale;
  return (
    <>
              <div className="hidden overflow-x-auto rounded-xl border md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          className="size-4"
                          checked={selectedRows.length > 0 && selectedRows.length === rows.length}
                          onChange={(e) => toggleAll(e.target.checked)}
                          aria-label={t("bankImport.selectAllAria")}
                        />
                      </TableHead>
                      <TableHead>{t("bankImport.table.date")}</TableHead>
                      <TableHead>{t("bankImport.table.description")}</TableHead>
                      <TableHead>{t("bankImport.table.amount")}</TableHead>
                      <TableHead>{t("table.type")}</TableHead>
                      <TableHead>{t("table.account")}</TableHead>
                      <TableHead>{t("bankImport.table.category")}</TableHead>
                      <TableHead className="text-right">{t("bankImport.table.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      const state = rowState[row.id] ?? {
                        selected: false,
                        bankAccountId: "",
                        category: "",
                      };
                      return (
                        <TableRow
                          key={row.id}
                          className={cn(
                            row.duplicate && "bg-destructive/5",
                            !state.selected && "opacity-60"
                          )}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              className="size-4"
                              checked={state.selected}
                              onChange={(e) =>
                                setRowState((prev) => ({
                                  ...prev,
                                  [row.id]: { ...state, selected: e.target.checked },
                                }))
                              }
                              aria-label={t("bankImport.selectRowAria", { index: row.rowIndex + 1 })}
                            />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {fmtDate(row.date, locale)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm">
                            {row.description}
                          </TableCell>
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
                          <TableCell>
                            <Select
                              value={state.bankAccountId}
                              onValueChange={(value) =>
                                setRowState((prev) => ({
                                  ...prev,
                                  [row.id]: { ...state, bankAccountId: value },
                                }))
                              }
                            >
                              <SelectTrigger className="h-8 w-44 text-xs">
                                <SelectValue placeholder={t("table.account")} />
                              </SelectTrigger>
                              <SelectContent>
                                {bankAccounts.map((account) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    {account.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={state.category}
                              onValueChange={(value) =>
                                setRowState((prev) => ({
                                  ...prev,
                                  [row.id]: { ...state, category: value },
                                }))
                              }
                            >
                              <SelectTrigger className="h-8 w-44 text-xs">
                                <SelectValue placeholder={t("bankImport.table.category")} />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORY_KEYS.map((key) => (
                                  <SelectItem key={key} value={key}>
                                    {tCat(CATEGORY_I18N_KEYS[key])}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-1 gap-3 md:hidden">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={selectedRows.length > 0 && selectedRows.length === rows.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                    aria-label={t("bankImport.selectAllAria")}
                  />
                  <span className="text-sm font-medium">{t("bankImport.selectAllAria")}</span>
                </div>
                {rows.map((row) => {
                  const state = rowState[row.id] ?? {
                    selected: false,
                    bankAccountId: "",
                    category: "",
                  };
                  return (
                    <div
                      key={row.id}
                      className={cn(
                        "surface-elevated-2 rounded-xl p-4",
                        row.duplicate && "border-destructive/30",
                        !state.selected && "opacity-60"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="size-4 mt-1"
                          checked={state.selected}
                          onChange={(e) =>
                            setRowState((prev) => ({
                              ...prev,
                              [row.id]: { ...state, selected: e.target.checked },
                            }))
                          }
                        />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-muted-foreground">
                              {fmtDate(row.date, locale)}
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
                          <p className="font-medium">{row.description}</p>
                          <p
                            className={cn(
                              "text-lg font-semibold",
                              row.type === "INCOME" ? "text-success" : "text-danger"
                            )}
                          >
                            {formatCurrency(row.amount, "COP", locale)}
                          </p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <Select
                              value={state.bankAccountId}
                              onValueChange={(value) =>
                                setRowState((prev) => ({
                                  ...prev,
                                  [row.id]: { ...state, bankAccountId: value },
                                }))
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={t("table.account")} />
                              </SelectTrigger>
                              <SelectContent>
                                {bankAccounts.map((account) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    {account.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={state.category}
                              onValueChange={(value) =>
                                setRowState((prev) => ({
                                  ...prev,
                                  [row.id]: { ...state, category: value },
                                }))
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={t("bankImport.table.category")} />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORY_KEYS.map((key) => (
                                  <SelectItem key={key} value={key}>
                                    {tCat(CATEGORY_I18N_KEYS[key])}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
    </>
  );
}
