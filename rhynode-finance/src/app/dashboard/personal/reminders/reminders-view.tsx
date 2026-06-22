"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServerDataTable } from "@/components/dashboard/server-data-table";
import { TableCell } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { Bell, Trash2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { ReminderDialog, type ReminderRow } from "./reminder-dialog";
import { formatDate as fmtDate } from "@/lib/format";
import type { Locale } from "@/lib/locale";

interface RemindersViewProps {
  reminders: ReminderRow[];
  defaultOpen?: boolean;
}

const repeatLabelKeys: Record<ReminderRow["repeat"], string> = {
  DAILY: "repeats.DAILY",
  WEEKLY: "repeats.WEEKLY",
  MONTHLY: "repeats.MONTHLY",
  NONE: "repeats.NONE",
};

function EmptyState({ defaultOpen }: { defaultOpen?: boolean }) {
  const t = useTranslations("dashboard.reminders");
  return (
    <EmptyStateCard
      variant="lg"
      icon={Bell}
      title={t("empty.title")}
      description={t("empty.description")}
      hint={t("empty.hint")}
      action={<ReminderDialog onSuccess={() => window.location.reload()} defaultOpen={defaultOpen} />}
    />
  );
}

export function RemindersView({ reminders, defaultOpen }: RemindersViewProps) {
  const t = useTranslations("dashboard.reminders");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [items, setItems] = useState(reminders);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refresh() {
    router.refresh();
    window.location.reload();
  }

  function formatScheduled(iso: string) {
    try {
      return fmtDate(iso, locale, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  async function toggleActive(id: string, active: boolean) {
    const original = items.find((r) => r.id === id);
    if (!original) return;

    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, active } : r)));

    try {
      const res = await fetch(`/api/personal/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(active ? t("toast.activated") : t("toast.deactivated"));
    } catch {
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, active: original.active } : r)));
      toast.error(t("toast.toggleError"));
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/personal/reminders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setItems((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("toast.deleted"));
    } catch {
      toast.error(t("toast.deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  const columns = [
    { key: "title", header: t("columns.title") },
    { key: "message", header: t("columns.message") },
    { key: "scheduled", header: t("columns.scheduled") },
    { key: "repeat", header: t("columns.repeat") },
    { key: "status", header: t("columns.status") },
    { key: "actions", header: t("columns.actions") },
  ];

  const activeCount = items.filter((r) => r.active).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">{t("subtitle")}</p>
        </div>
        <ReminderDialog onSuccess={refresh} defaultOpen={defaultOpen} />
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" aria-hidden="true" />
              {t("stats.total")}
            </div>
            <p className="mt-1 text-2xl font-bold">{items.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {t("stats.active")}
            </div>
            <p className="mt-1 text-2xl font-bold">{activeCount}</p>
          </div>
        </div>
      )}

      <ServerDataTable
        columns={columns}
        data={items}
        emptyState={<EmptyState />}
        renderRow={(reminder) => {
          const status = reminder.read ? t("status.completed") : reminder.active ? t("status.active") : t("status.inactive");
          return (
            <>
              <TableCell className="py-3 font-medium">{reminder.title}</TableCell>
              <TableCell className="py-3 max-w-xs truncate">{reminder.message}</TableCell>
              <TableCell className="py-3">{formatScheduled(reminder.scheduledAt)}</TableCell>
              <TableCell className="py-3">
                <Badge variant="outline">{t(repeatLabelKeys[reminder.repeat] as never)}</Badge>
              </TableCell>
              <TableCell className="py-3">
                <Badge variant={reminder.active ? "default" : "secondary"}>
                  {status}
                </Badge>
              </TableCell>
              <TableCell className="py-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={reminder.active}
                    onCheckedChange={(checked) => toggleActive(reminder.id, checked)}
                    aria-label={`${reminder.active ? t("aria.deactivate") : t("aria.activate")} ${reminder.title}`}
                  />
                  <ReminderDialog reminder={reminder} onSuccess={refresh} />
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={deletingId === reminder.id}
                    onClick={() => handleDelete(reminder.id)}
                    aria-label={`${t("aria.delete")} ${reminder.title}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </TableCell>
            </>
          );
        }}
        renderCard={(reminder) => {
          const status = reminder.read ? t("status.completed") : reminder.active ? t("status.active") : t("status.inactive");
          return (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold leading-tight">{reminder.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{reminder.message}</p>
                </div>
                <Badge variant={reminder.active ? "default" : "secondary"}>{status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-muted-foreground">{t("columns.scheduled")}</div>
                <div className="text-right font-medium">{formatScheduled(reminder.scheduledAt)}</div>
                <div className="text-muted-foreground">{t("columns.repeat")}</div>
                <div className="text-right">{t(repeatLabelKeys[reminder.repeat] as never)}</div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Switch
                  checked={reminder.active}
                  onCheckedChange={(checked) => toggleActive(reminder.id, checked)}
                  aria-label={`${reminder.active ? t("aria.deactivate") : t("aria.activate")} ${reminder.title}`}
                />
                <ReminderDialog reminder={reminder} onSuccess={refresh} />
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={deletingId === reminder.id}
                  onClick={() => handleDelete(reminder.id)}
                  aria-label={`${t("aria.delete")} ${reminder.title}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}