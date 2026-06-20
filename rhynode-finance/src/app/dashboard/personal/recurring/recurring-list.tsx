"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("dashboard.recurring");
  const [items, setItems] = useState(initialItems);

  async function handleToggle(item: RecurringItem, active: boolean) {
    const nextStatus = active ? "ACTIVE" : "PAUSED";
    const previousStatus = item.status;

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i)),
    );

    try {
      const res = await fetch(`/api/personal/recurring/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        toast.success(active ? t("toasts.activated") : t("toasts.paused"));
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("toasts.statusError"));
      }
    } catch (error) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: previousStatus } : i)),
      );
      toast.error(error instanceof Error ? error.message : t("toasts.networkError"));
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
              <TableHead scope="col">{t("list.name")}</TableHead>
              <TableHead scope="col">{t("list.amount")}</TableHead>
              <TableHead scope="col">{t("list.frequency")}</TableHead>
              <TableHead scope="col">{t("list.next")}</TableHead>
              <TableHead scope="col">{t("list.type")}</TableHead>
              <TableHead scope="col">{t("list.subscription")}</TableHead>
              <TableHead scope="col">{t("list.status")}</TableHead>
              <TableHead scope="col" className="text-right">{t("list.actions")}</TableHead>
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