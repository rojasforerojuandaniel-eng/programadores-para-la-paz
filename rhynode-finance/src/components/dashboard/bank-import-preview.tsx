"use client";

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
import { COMMON_CATEGORIES } from "@/components/dashboard/transaction-form";
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
                          aria-label="Seleccionar todas"
                        />
                      </TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Estado</TableHead>
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
                              aria-label={`Seleccionar fila ${row.rowIndex + 1}`}
                            />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {new Date(row.date).toLocaleDateString("es-CO")}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm">
                            {row.description}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm font-medium">
                            {row.amount.toLocaleString("es-CO", {
                              style: "currency",
                              currency: "COP",
                              maximumFractionDigits: 0,
                            })}
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
                              {row.type === "INCOME" ? "Ingreso" : "Gasto"}
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
                                <SelectValue placeholder="Cuenta" />
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
                                <SelectValue placeholder="Categoría" />
                              </SelectTrigger>
                              <SelectContent>
                                {COMMON_CATEGORIES.map((cat: string) => (
                                  <SelectItem key={cat} value={cat}>
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            {row.duplicate ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Duplicado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-success">
                                <Check className="h-3 w-3" />
                                Nuevo
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
                    aria-label="Seleccionar todas"
                  />
                  <span className="text-sm font-medium">Seleccionar todas</span>
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
                              {new Date(row.date).toLocaleDateString("es-CO")}
                            </span>
                            {row.duplicate ? (
                              <Badge variant="destructive" className="gap-1 text-xs">
                                <AlertCircle className="h-3 w-3" />
                                Duplicado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-xs text-success">
                                <Check className="h-3 w-3" />
                                Nuevo
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
                            {row.amount.toLocaleString("es-CO", {
                              style: "currency",
                              currency: "COP",
                              maximumFractionDigits: 0,
                            })}
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
                                <SelectValue placeholder="Cuenta" />
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
                                <SelectValue placeholder="Categoría" />
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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
    </>
  );
}
