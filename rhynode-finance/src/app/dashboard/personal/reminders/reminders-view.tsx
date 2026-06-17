"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServerDataTable } from "@/components/dashboard/server-data-table";
import { TableCell } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { Bell, Trash2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { ReminderDialog, type ReminderRow } from "./reminder-dialog";

interface RemindersViewProps {
  reminders: ReminderRow[];
}

function repeatLabel(repeat: ReminderRow["repeat"]) {
  switch (repeat) {
    case "DAILY":
      return "Diario";
    case "WEEKLY":
      return "Semanal";
    case "MONTHLY":
      return "Mensual";
    default:
      return "Una vez";
  }
}

function formatScheduled(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-CO", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function EmptyState() {
  return (
    <EmptyStateCard
      variant="lg"
      icon={Bell}
      title="Crea recordatorios personalizados"
      description="Programa alertas para pagos, metas o cualquier recordatorio financiero."
      hint="Empieza creando tu primer recordatorio."
      action={<ReminderDialog onSuccess={() => window.location.reload()} />}
    />
  );
}

export function RemindersView({ reminders }: RemindersViewProps) {
  const router = useRouter();
  const [items, setItems] = useState(reminders);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refresh() {
    router.refresh();
    window.location.reload();
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
      toast.success(active ? "Recordatorio activado" : "Recordatorio desactivado");
    } catch {
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, active: original.active } : r)));
      toast.error("Error al cambiar estado");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/personal/reminders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setItems((prev) => prev.filter((r) => r.id !== id));
      toast.success("Recordatorio eliminado");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  const columns = [
    { key: "title", header: "Título" },
    { key: "message", header: "Mensaje" },
    { key: "scheduled", header: "Fecha" },
    { key: "repeat", header: "Repetición" },
    { key: "status", header: "Estado" },
    { key: "actions", header: "Acciones" },
  ];

  const activeCount = items.filter((r) => r.active).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">Recordatorios</h1>
          <p className="body-default mt-1">Administra tus recordatorios programados</p>
        </div>
        <ReminderDialog onSuccess={refresh} />
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" aria-hidden="true" />
              Total
            </div>
            <p className="mt-1 text-2xl font-bold">{items.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Activos
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
          const status = reminder.read ? "Completado" : reminder.active ? "Activo" : "Inactivo";
          return (
            <>
              <TableCell className="py-3 font-medium">{reminder.title}</TableCell>
              <TableCell className="py-3 max-w-xs truncate">{reminder.message}</TableCell>
              <TableCell className="py-3">{formatScheduled(reminder.scheduledAt)}</TableCell>
              <TableCell className="py-3">
                <Badge variant="outline">{repeatLabel(reminder.repeat)}</Badge>
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
                    aria-label={`${reminder.active ? "Desactivar" : "Activar"} ${reminder.title}`}
                  />
                  <ReminderDialog reminder={reminder} onSuccess={refresh} />
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={deletingId === reminder.id}
                    onClick={() => handleDelete(reminder.id)}
                    aria-label={`Eliminar ${reminder.title}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </TableCell>
            </>
          );
        }}
        renderCard={(reminder) => {
          const status = reminder.read ? "Completado" : reminder.active ? "Activo" : "Inactivo";
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
                <div className="text-muted-foreground">Fecha</div>
                <div className="text-right font-medium">{formatScheduled(reminder.scheduledAt)}</div>
                <div className="text-muted-foreground">Repetición</div>
                <div className="text-right">{repeatLabel(reminder.repeat)}</div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Switch
                  checked={reminder.active}
                  onCheckedChange={(checked) => toggleActive(reminder.id, checked)}
                  aria-label={`${reminder.active ? "Desactivar" : "Activar"} ${reminder.title}`}
                />
                <ReminderDialog reminder={reminder} onSuccess={refresh} />
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={deletingId === reminder.id}
                  onClick={() => handleDelete(reminder.id)}
                  aria-label={`Eliminar ${reminder.title}`}
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
