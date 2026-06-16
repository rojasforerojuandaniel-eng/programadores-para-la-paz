"use client";

import { ReactNode } from "react";
import {
  Table,
  TableBody,
  // TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<T> {
  columns: { key: string; header: string; className?: string }[];
  data: T[];
  renderRow: (item: T) => ReactNode;
  renderCard?: (item: T) => ReactNode;
  emptyState: ReactNode;
  loading?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  renderRow,
  renderCard,
  emptyState,
  loading,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (data.length === 0) return <>{emptyState}</>;

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, i) => (
              <TableRow key={i}>{renderRow(item)}</TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <ul className="grid grid-cols-1 gap-4 md:hidden" role="list">
        {data.map((item, i) => (
          <li
            key={i}
            className="surface-elevated-2 rounded-xl p-5"
          >
            {renderCard ? renderCard(item) : renderRow(item)}
          </li>
        ))}
      </ul>
    </>
  );
}
