"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { executeMutation } from "@/lib/offline-queue";

export interface ReminderRow {
  id: string;
  title: string;
  message: string;
  scheduledAt: string;
  repeat: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  active: boolean;
  read: boolean;
  lastSentAt?: string;
}

interface ReminderDialogProps {
  reminder?: ReminderRow;
  onSuccess: () => void;
  defaultOpen?: boolean;
}

function toLocalInputValue(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalInputValue(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return date.toISOString();
}

export function ReminderDialog({ reminder, onSuccess, defaultOpen = false }: ReminderDialogProps) {
  const isEdit = Boolean(reminder);
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: reminder?.title ?? "",
    message: reminder?.message ?? "",
    scheduledAt: toLocalInputValue(reminder?.scheduledAt) || new Date().toISOString().slice(0, 16),
    repeat: reminder?.repeat ?? "NONE",
    active: reminder?.active ?? true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim() || !form.scheduledAt) return;

    setLoading(true);
    try {
      const url = isEdit ? `/api/personal/reminders/${reminder?.id}` : "/api/personal/reminders";
      const method = isEdit ? "PATCH" : "POST";
      await executeMutation(
        url,
        method,
        {
          title: form.title,
          message: form.message,
          scheduledAt: fromLocalInputValue(form.scheduledAt),
          repeat: form.repeat,
          active: form.active,
        },
        {
          onSuccess: () => {
            setOpen(false);
            onSuccess();
            toast.success(isEdit ? "Recordatorio actualizado" : "Recordatorio creado");
          },
          onError: (err) => {
            toast.error(err.message || "Error al guardar recordatorio");
          },
        },
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Editar recordatorio">
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo recordatorio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">
            {isEdit ? "Editar recordatorio" : "Nuevo recordatorio"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="reminder-title">Título *</Label>
            <Input
              id="reminder-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ej. Revisar gastos del mes"
              required
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reminder-message">Mensaje *</Label>
            <Input
              id="reminder-message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Ej. Revisa tus gastos hormiga antes de dormir"
              required
              maxLength={500}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reminder-date">Fecha y hora *</Label>
              <Input
                id="reminder-date"
                type="datetime-local"
                required
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-repeat">Repetición</Label>
              <Select
                value={form.repeat}
                onValueChange={(v) => setForm({ ...form, repeat: v as typeof form.repeat })}
              >
                <SelectTrigger id="reminder-repeat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Una vez</SelectItem>
                  <SelectItem value="DAILY">Diario</SelectItem>
                  <SelectItem value="WEEKLY">Semanal</SelectItem>
                  <SelectItem value="MONTHLY">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Switch
              id="reminder-active"
              checked={form.active}
              onCheckedChange={(checked) => setForm({ ...form, active: checked })}
            />
            <Label htmlFor="reminder-active" className="text-sm">{form.active ? "Activo" : "Inactivo"}</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : isEdit ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
