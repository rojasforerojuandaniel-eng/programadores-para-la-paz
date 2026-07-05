"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  Tag,
  Bus,
  Film,
  Coffee,
  ShoppingCart,
  Zap,
  Wifi,
  ShieldCheck,
  Heart,
  GraduationCap,
  Plane,
  Dog,
  Briefcase,
  Building2,
  Utensils,
  Landmark,
  Repeat,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  ArrowLeftRight,
  X,
  FilterX,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import {
  TransactionFilters,
  type TransactionFiltersState,
  type TransactionFilterOptions,
} from "@/components/dashboard/transactions-filters";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate as fmtDate } from "@/lib/format";
import type { Locale } from "@/lib/locale";

import type { Transaction, TransactionType } from "@/types";
export type { Transaction } from "@/types";

interface TransactionsListProps {
  transactions: Transaction[];
  orgCurrency: string;
  filterOptions: TransactionFilterOptions;
}

const typeConfig = {
  INCOME: { labelKey: "types.INCOME", className: "bg-success/10 text-success" },
  EXPENSE: { labelKey: "types.EXPENSE", className: "bg-danger/10 text-danger" },
  TRANSFER: { labelKey: "types.TRANSFER", className: "bg-info/10 text-info" },
  ADJUSTMENT: { labelKey: "types.ADJUSTMENT", className: "bg-muted text-muted-foreground" },
} as const;

const categoryStyles = {
  "Transporte / Delivery": {
    icon: Bus,
    className: "bg-blue-500/10 text-blue-600",
    labelKey: "categories.transportationDelivery",
  },
  Transporte: { icon: Bus, className: "bg-blue-500/10 text-blue-600", labelKey: "categories.transportation" },
  Entretenimiento: { icon: Film, className: "bg-purple-500/10 text-purple-600", labelKey: "categories.entertainment" },
  Café: { icon: Coffee, className: "bg-amber-700/10 text-amber-700", labelKey: "categories.coffee" },
  Mercado: { icon: ShoppingCart, className: "bg-green-500/10 text-green-600", labelKey: "categories.market" },
  Restaurante: { icon: Utensils, className: "bg-orange-500/10 text-orange-600", labelKey: "categories.restaurant" },
  Telecomunicaciones: { icon: Wifi, className: "bg-cyan-500/10 text-cyan-600", labelKey: "categories.telecommunications" },
  "Servicios públicos": {
    icon: Zap,
    className: "bg-yellow-500/10 text-yellow-600",
    labelKey: "categories.utilities",
  },
  Seguros: { icon: ShieldCheck, className: "bg-indigo-500/10 text-indigo-600", labelKey: "categories.insurance" },
  Salud: { icon: Heart, className: "bg-rose-500/10 text-rose-600", labelKey: "categories.health" },
  Educación: { icon: GraduationCap, className: "bg-teal-500/10 text-teal-600", labelKey: "categories.education" },
  "Transferencia/Finanzas": {
    icon: Building2,
    className: "bg-slate-500/10 text-slate-600",
    labelKey: "categories.financeTransfer",
  },
  Ropa: { icon: Tag, className: "bg-pink-500/10 text-pink-600", labelKey: "categories.clothing" },
  Viajes: { icon: Plane, className: "bg-sky-500/10 text-sky-600", labelKey: "categories.travel" },
  Mascotas: { icon: Dog, className: "bg-emerald-500/10 text-emerald-600", labelKey: "categories.pets" },
  Compras: { icon: ShoppingCart, className: "bg-violet-500/10 text-violet-600", labelKey: "categories.shopping" },
  Ventas: { icon: Briefcase, className: "bg-success/10 text-success", labelKey: "categories.sales" },
  Nómina: { icon: Briefcase, className: "bg-primary/10 text-primary", labelKey: "categories.payroll" },
  Servicios: { icon: Briefcase, className: "bg-blue-500/10 text-blue-600", labelKey: "categories.services" },
  Materiales: { icon: Tag, className: "bg-orange-500/10 text-orange-600", labelKey: "categories.materials" },
  Marketing: { icon: Tag, className: "bg-pink-500/10 text-pink-600", labelKey: "categories.marketing" },
  Otros: { icon: Tag, className: "bg-muted text-muted-foreground", labelKey: "categories.other" },
} as const;

type CategoryStyle = (typeof categoryStyles)[keyof typeof categoryStyles];

function getCategoryMeta(category?: string): CategoryStyle {
  return (categoryStyles as Record<string, CategoryStyle>)[category ?? ""] ?? categoryStyles.Otros;
}

function Checkbox({
  checked,
  onCheckedChange,
  ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <label className="relative flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border border-input bg-background transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary focus-within:ring-2 focus-within:ring-ring/50">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        aria-label={ariaLabel}
      />
      <Check className="h-3.5 w-3.5 text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100" />
    </label>
  );
}

function CategoryBadge({ category }: { category?: string }) {
  const t = useTranslations("dashboard.transactions");
  const meta = getCategoryMeta(category);
  const label = meta.labelKey
    ? t(meta.labelKey)
    : category || t("list.noCategory");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        meta.className
      )}
    >
      <meta.icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: TransactionType }) {
  const t = useTranslations("dashboard.transactions");
  const config = typeConfig[type] ?? typeConfig.ADJUSTMENT;
  return (
    <Badge variant="outline" className={cn(config.className)}>
      {t(config.labelKey)}
    </Badge>
  );
}

function Amount({ tx, fallbackCurrency }: { tx: Transaction; fallbackCurrency: string }) {
  const locale = useLocale() as Locale;
  const className =
    tx.type === "INCOME"
      ? "text-success"
      : tx.type === "EXPENSE"
        ? "text-danger"
        : "text-foreground";
  return (
    <span className={cn("font-semibold", className)}>
      {formatCurrency(tx.amount, tx.currency || fallbackCurrency, locale)}
    </span>
  );
}

function BulkActionsBar({
  count,
  onDelete,
  onChangeCategory,
  onClear,
}: {
  count: number;
  onDelete: () => void;
  onChangeCategory: () => void;
  onClear: () => void;
}) {
  const t = useTranslations("dashboard.transactions");
  return (
    <div className="surface-elevated-3 fixed inset-x-4 bottom-4 z-40 flex items-center gap-2 rounded-2xl p-3 shadow-lg sm:bottom-6 sm:inset-x-6 md:static md:mb-4 md:w-full md:shadow-none">
      <div className="flex flex-1 items-center gap-2 text-sm font-medium">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
          {count}
        </span>
        <span className="hidden sm:inline">{t("list.selected")}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onChangeCategory}>
          {t("list.changeCategory")}
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          {t("list.delete")}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
          aria-label={t("list.clearSelection")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TransactionActionsSheet({
  tx,
  open,
  onOpenChange,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  tx: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}) {
  const t = useTranslations("dashboard.transactions");
  if (!tx) return null;
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent snapPoints={["45dvh"]} className="rounded-t-2xl">
        <BottomSheetHeader>
          <BottomSheetTitle className="heading-card">{t("list.actions")}</BottomSheetTitle>
          <p className="text-sm text-muted-foreground">{tx.description}</p>
        </BottomSheetHeader>
        <div className="flex flex-col gap-1 py-4">
          <Button
            variant="ghost"
            className="justify-start gap-3"
            onClick={() => {
              onOpenChange(false);
              onEdit(tx);
            }}
          >
            <Pencil className="h-4 w-4" />
            {t("list.edit")}
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-3"
            onClick={() => {
              onOpenChange(false);
              onDuplicate(tx);
            }}
          >
            <Copy className="h-4 w-4" />
            {t("list.duplicate")}
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-3 text-destructive hover:text-destructive"
            onClick={() => {
              onOpenChange(false);
              onDelete(tx);
            }}
          >
            <Trash2 className="h-4 w-4" />
            {t("list.delete")}
          </Button>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}

function EditTransactionDialog({
  tx,
  open,
  onOpenChange,
}: {
  tx: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("dashboard.transactions");
  if (!tx) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast.info(t("list.editComingSoon"));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("list.editTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-type">{t("form.type")}</Label>
              <Select defaultValue={tx.type} disabled>
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">{t("types.INCOME")}</SelectItem>
                  <SelectItem value="EXPENSE">{t("types.EXPENSE")}</SelectItem>
                  <SelectItem value="TRANSFER">{t("types.TRANSFER")}</SelectItem>
                  <SelectItem value="ADJUSTMENT">{t("types.ADJUSTMENT")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-currency">{t("form.currency")}</Label>
              <Select defaultValue={tx.currency} disabled>
                <SelectTrigger id="edit-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="MXN">MXN</SelectItem>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">{t("form.description")}</Label>
            <Input id="edit-description" defaultValue={tx.description} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">{t("form.amount")}</Label>
              <Input id="edit-amount" type="number" defaultValue={tx.amount} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">{t("form.category")}</Label>
              <Input id="edit-category" defaultValue={tx.category} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("list.close")}
            </Button>
            <Button type="submit">{t("list.saveChanges")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getSearchParam(params: URLSearchParams, key: string): string {
  return params.get(key) ?? "";
}

function parseFiltersFromSearchParams(
  params: URLSearchParams
): TransactionFiltersState {
  const type = getSearchParam(params, "type");
  return {
    q: getSearchParam(params, "q"),
    from: getSearchParam(params, "from"),
    to: getSearchParam(params, "to"),
    type: type === "INCOME" || type === "EXPENSE" ? type : "all",
    category: getSearchParam(params, "category"),
    account: getSearchParam(params, "account"),
    min: getSearchParam(params, "min"),
    max: getSearchParam(params, "max"),
  };
}

export function TransactionsList({
  transactions,
  orgCurrency,
  filterOptions,
}: TransactionsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("dashboard.transactions");
  const locale = useLocale() as Locale;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionTx, setActionTx] = useState<Transaction | null>(null);
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  const filters = parseFiltersFromSearchParams(searchParams);
  const filtered = transactions;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.q.trim()) count += 1;
    if (filters.type !== "all") count += 1;
    if (filters.category) count += 1;
    if (filters.account) count += 1;
    if (filters.from) count += 1;
    if (filters.to) count += 1;
    if (filters.min) count += 1;
    if (filters.max) count += 1;
    return count;
  }, [filters]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((t) => selectedIds.has(t.id));
  const hasSelection = selectedIds.size > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((t) => next.delete(t.id));
      } else {
        filtered.forEach((t) => next.add(t.id));
      }
      return next;
    });
  }, [filtered, allFilteredSelected]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleFilterChange = useCallback(
    (next: TransactionFiltersState) => {
      const params = new URLSearchParams(searchParams.toString());
      const setOrDelete = (key: string, value: string) => {
        if (value && value !== "all") params.set(key, value);
        else params.delete(key);
      };

      setOrDelete("q", next.q);
      setOrDelete("type", next.type);
      setOrDelete("category", next.category);
      setOrDelete("account", next.account);
      setOrDelete("from", next.from);
      setOrDelete("to", next.to);
      setOrDelete("min", next.min);
      setOrDelete("max", next.max);

      const query = params.toString();
      const targetUrl = query ? `${pathname}?${query}` : pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleResetFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const handleDelete = useCallback(
    async (tx: Transaction) => {
      if (!confirm(t("list.confirmDelete"))) return;
      try {
        const res = await fetch(`/api/transactions/${tx.id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          toast.success(t("list.deleted"));
          router.refresh();
        } else {
          toast.error(t("list.deleteError"));
        }
      } catch {
        toast.error(t("list.networkError"));
      }
    },
    [router, t]
  );

  const handleDuplicate = useCallback(
    async (tx: Transaction) => {
      try {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: tx.type,
            category: tx.category,
            description: t("list.duplicateSuffix", { description: tx.description }),
            amount: tx.amount,
            currency: tx.currency,
            date: new Date().toISOString(),
          }),
        });
        if (res.ok) {
          toast.success(t("list.duplicated"));
          router.refresh();
        } else {
          toast.error(t("list.duplicateError"));
        }
      } catch {
        toast.error(t("list.networkError"));
      }
    },
    [router, t]
  );

  const handleEdit = useCallback((tx: Transaction) => setEditTx(tx), []);

  const handleBulkDelete = useCallback(() => {
    toast.info(t("list.bulkDeleteComingSoon", { count: selectedIds.size }));
    clearSelection();
  }, [selectedIds.size, clearSelection, t]);

  const handleBulkChangeCategory = useCallback(() => {
    toast.info(
      t("list.bulkCategoryComingSoon", { count: selectedIds.size })
    );
    clearSelection();
  }, [selectedIds.size, clearSelection, t]);

  return (
    <CardContent className="space-y-4">
      <TransactionFilters
        filters={filters}
        options={filterOptions}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      <div className="flex items-center justify-between">
        <span
          className="text-sm text-muted-foreground"
          aria-live="polite"
          aria-atomic="true"
        >
          {activeFilterCount > 0
            ? t("list.countFiltered", { count: filtered.length })
            : t("list.count", { count: filtered.length })}
        </span>
      </div>

      {filtered.length === 0 ? (
        activeFilterCount > 0 ? (
          <EmptyStateCard
            variant="md"
            icon={FilterX}
            title={t("list.noResultsTitle")}
            description={t("list.noResultsDescription")}
            hint={t("list.noResultsHint")}
            action={
              <Button variant="outline" onClick={handleResetFilters}>
                {t("list.clearFilters")}
              </Button>
            }
          />
        ) : (
          <EmptyStateCard
            variant="lg"
            icon={ArrowLeftRight}
            title={t("list.emptyTitle")}
            description={t("list.emptyDescription")}
            hint={t("list.emptyHint")}
          />
        )
      ) : (
        <>
          {hasSelection && (
            <BulkActionsBar
              count={selectedIds.size}
              onDelete={handleBulkDelete}
              onChangeCategory={handleBulkChangeCategory}
              onClear={clearSelection}
            />
          )}

          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={toggleAllFiltered}
                      ariaLabel={t("list.selectVisible")}
                    />
                  </TableHead>
                  <TableHead scope="col">{t("list.columns.date")}</TableHead>
                  <TableHead scope="col">{t("list.columns.type")}</TableHead>
                  <TableHead scope="col">{t("list.columns.category")}</TableHead>
                  <TableHead scope="col">{t("list.columns.description")}</TableHead>
                  <TableHead scope="col" className="text-right">
                    {t("list.columns.amount")}
                  </TableHead>
                  <TableHead scope="col">{t("list.columns.account")}</TableHead>
                  <TableHead scope="col" className="text-right">
                    {t("list.columns.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tx) => {
                  const meta = getCategoryMeta(tx.category);
                  return (
                    <TableRow key={tx.id} className="group">
                      <TableCell className="w-10">
                        <Checkbox
                          checked={selectedIds.has(tx.id)}
                          onCheckedChange={() => toggleSelect(tx.id)}
                          ariaLabel={t("list.selectOne", { description: tx.description })}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {fmtDate(tx.date, locale)}
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={tx.type} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-lg",
                              meta.className
                            )}
                          >
                            <meta.icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-sm">
                            {meta.labelKey ? t(meta.labelKey) : tx.category || "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate font-medium">
                        {tx.description}
                      </TableCell>
                      <TableCell className="text-right">
                        <Amount tx={tx} fallbackCurrency={orgCurrency} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.bankAccountName || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setActionTx(tx)}
                            aria-label={t("list.transactionActions")}
                            className="md:hidden"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                          <div className="hidden md:block">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={t("list.transactionActions")}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(tx)}>
                                  <Pencil className="h-4 w-4" />
                                  {t("list.edit")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDuplicate(tx)}
                                >
                                  <Copy className="h-4 w-4" />
                                  {t("list.duplicate")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDelete(tx)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  {t("list.delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="grid gap-3 md:hidden" role="list">
            {filtered.map((tx) => {
              const meta = getCategoryMeta(tx.category);
              return (
                <li
                  key={tx.id}
                  className="surface-elevated-2 relative rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-1">
                      <Checkbox
                        checked={selectedIds.has(tx.id)}
                        onCheckedChange={() => toggleSelect(tx.id)}
                        ariaLabel={t("list.selectOne", { description: tx.description })}
                      />
                    </div>
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        meta.className
                      )}
                    >
                      <meta.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium leading-tight">
                            {tx.description}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {fmtDate(tx.date, locale)}
                            </span>
                            {tx.bankAccountName && (
                              <span className="inline-flex items-center gap-1 truncate">
                                <Landmark className="h-3 w-3" />
                                {tx.bankAccountName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <Amount tx={tx} fallbackCurrency={orgCurrency} />
                          <div className="mt-1">
                            <TypeBadge type={tx.type} />
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <CategoryBadge category={tx.category} />
                          {tx.isRecurring && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-xs font-medium text-info">
                              <Repeat className="h-3 w-3" />
                              {t("list.recurring")}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setActionTx(tx)}
                          aria-label={t("list.transactionActions")}
                          className="shrink-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <TransactionActionsSheet
        tx={actionTx}
        open={actionTx !== null}
        onOpenChange={(open) => {
          if (!open) setActionTx(null);
        }}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />

      <EditTransactionDialog
        tx={editTx}
        open={editTx !== null}
        onOpenChange={(open) => {
          if (!open) setEditTx(null);
        }}
      />
    </CardContent>
  );
}
