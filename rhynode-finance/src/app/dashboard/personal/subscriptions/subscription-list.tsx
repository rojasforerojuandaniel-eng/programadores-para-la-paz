"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SubscriptionItem } from "./subscription-utils";
import { SubscriptionCard } from "./subscription-card";
import { SubscriptionRow } from "./subscription-row";

interface SubscriptionListProps {
  items: SubscriptionItem[];
  emptyState: React.ReactNode;
}

export function SubscriptionList({ items: initialItems, emptyState }: SubscriptionListProps) {
  const [items, setItems] = useState(initialItems);

  function handleUpdate(updated: SubscriptionItem) {
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
              <TableHead scope="col">Suscripción</TableHead>
              <TableHead scope="col">Monto</TableHead>
              <TableHead scope="col">Frecuencia</TableHead>
              <TableHead scope="col">Próxima renovación</TableHead>
              <TableHead scope="col">Estado</TableHead>
              <TableHead scope="col" className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <SubscriptionRow
                  item={item}
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
            <SubscriptionCard
              item={item}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
