"use client";

import { useCallback } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TransactionFiltersState {
  q: string;
  from: string;
  to: string;
  type: "all" | "INCOME" | "EXPENSE";
  category: string;
  account: string;
  min: string;
  max: string;
}

export interface TransactionFilterOptions {
  categories: string[];
  accounts: { id: string; name: string; bankName: string }[];
}

interface TransactionFiltersProps {
  filters: TransactionFiltersState;
  options: TransactionFilterOptions;
  onChange: (filters: TransactionFiltersState) => void;
  onReset: () => void;
  className?: string;
}

const typeOptions: { value: TransactionFiltersState["type"]; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "INCOME", label: "Ingresos" },
  { value: "EXPENSE", label: "Gastos" },
];

function countActiveFilters(filters: TransactionFiltersState): number {
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
}

export function TransactionFilters({
  filters,
  options,
  onChange,
  onReset,
  className,
}: TransactionFiltersProps) {
  const update = useCallback(
    <K extends keyof TransactionFiltersState>(key: K, value: TransactionFiltersState[K]) => {
      onChange({ ...filters, [key]: value });
    },
    [filters, onChange]
  );

  const activeCount = countActiveFilters(filters);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar descripción..."
            value={filters.q}
            onChange={(e) => update("q", e.target.value)}
            className="pl-9"
            aria-label="Buscar por descripción"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={filters.type} onValueChange={(value) => update("type", value as TransactionFiltersState["type"])}>
            <SelectTrigger className="w-[140px]" aria-label="Filtrar por tipo">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.category} onValueChange={(value) => update("category", value)}>
            <SelectTrigger className="w-[180px]" aria-label="Filtrar por categoría">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las categorías</SelectItem>
              {options.categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.account} onValueChange={(value) => update("account", value)}>
            <SelectTrigger className="w-[180px]" aria-label="Filtrar por cuenta">
              <SelectValue placeholder="Cuenta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las cuentas</SelectItem>
              {options.accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} ({account.bankName})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="filter-from" className="text-xs text-muted-foreground">
            Fecha desde
          </Label>
          <Input
            id="filter-from"
            type="date"
            value={filters.from}
            onChange={(e) => update("from", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-to" className="text-xs text-muted-foreground">
            Fecha hasta
          </Label>
          <Input
            id="filter-to"
            type="date"
            value={filters.to}
            onChange={(e) => update("to", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-min" className="text-xs text-muted-foreground">
            Monto mínimo
          </Label>
          <Input
            id="filter-min"
            type="number"
            min={0}
            placeholder="0"
            value={filters.min}
            onChange={(e) => update("min", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-max" className="text-xs text-muted-foreground">
            Monto máximo
          </Label>
          <Input
            id="filter-max"
            type="number"
            min={0}
            placeholder="0"
            value={filters.max}
            onChange={(e) => update("max", e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          {activeCount > 0 ? (
            <Badge variant="secondary" className="gap-1">
              {activeCount} filtro{activeCount === 1 ? "" : "s"} activo{activeCount === 1 ? "" : "s"}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Sin filtros activos</span>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={activeCount === 0}
          className="gap-1"
        >
          <X className="h-4 w-4" />
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}
