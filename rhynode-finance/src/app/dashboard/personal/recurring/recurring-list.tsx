"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RecurringItem } from "./recurring-utils";
import { RecurringCard } from "./recurring-card";
import { RecurringRow } from "./recurring-row";

interface RecurringListProps {
  items: RecurringItem[];
  emptyState: React.ReactNode;
}

export function RecurringList({ items: initialItems, emptyState }: RecurringListProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);

  async function handleToggle(item: RecurringItem, active: boolean) {
    const nextStatus = active ? "ACTIVE" : "PAUSED";
    const previousStatus = item.status;

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i))
    );

    try {
      const res = await fetch(`/api/personal/recurring/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        toast.success(active ? "Recurrente activado" : "Recurrente pausado");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo cambiar el estado");
      }
    } catch (error) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: previousStatus } : i))
      );
      toast.error(error instanceof Error ? error.message : "Error de red");
    }
  }

  function handleUpdate(updated: RecurringItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  if (items.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col">Nombre</TableHead>
              <TableHead scope="col">Monto</TableHead>
              <TableHead scope="col">Frecuencia</TableHead>
              <TableHead scope="col">Próximo vencimiento</TableHead>
              <TableHead scope="col">Tipo</TableHead>
              <TableHead scope="col">Suscripción</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <RecurringRow
                  item={item}
                  onToggle={handleToggle}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="grid grid-cols-1 gap-4 md:hidden" role="list">
        {items.map((item) => (
          <li key={item.id}>
            <RecurringCard
              item={item}
              onToggle={handleToggle}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
