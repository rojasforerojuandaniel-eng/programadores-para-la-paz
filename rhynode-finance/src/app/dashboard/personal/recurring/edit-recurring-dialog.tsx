"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { toast } from "sonner";
import type { RecurringItem } from "./recurring-utils";
import { frequencyLabel, typeLabel } from "./recurring-utils";

const FREQUENCIES = [
  "DAILY",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
] as const;

const TYPES = ["EXPENSE", "INCOME", "TRANSFER"] as const;

interface EditRecurringDialogProps {
  item: RecurringItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (item: RecurringItem) => void;
}

export function EditRecurringDialog({
  item,
  open,
  onOpenChange,
  onSaved,
}: EditRecurringDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: item.name,
    description: item.description || "",
    amount: String(item.amount),
    type: item.type,
    frequency: item.frequency,
    nextDueDate: item.nextDueDate.slice(0, 10),
    isSubscription: item.isSubscription,
    provider: item.provider || "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.amount || !form.nextDueDate) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/personal/recurring/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          amount: Number(form.amount),
          type: form.type,
          frequency: form.frequency,
          nextDueDate: form.nextDueDate,
          isSubscription: form.isSubscription,
          provider: form.provider || undefined,
        }),
      });

      if (res.ok) {
        toast.success("Transacción recurrente actualizada");
        onSaved?.({
          ...item,
          name: form.name,
          description: form.description || null,
          amount: Number(form.amount),
          type: form.type,
          frequency: form.frequency,
          nextDueDate: new Date(form.nextDueDate).toISOString(),
          isSubscription: form.isSubscription,
          provider: form.provider || null,
        });
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "No se pudo actualizar");
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">Editar recurrente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre</Label>
            <Input
              id="edit-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-desc">Descripción</Label>
            <Input
              id="edit-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Monto</Label>
              <Input
                id="edit-amount"
                type="number"
                required
                min={0}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v })}
              >
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {typeLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-frequency">Frecuencia</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => setForm({ ...form, frequency: v })}
              >
                <SelectTrigger id="edit-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {frequencyLabel(f)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-next">Próximo vencimiento</Label>
              <Input
                id="edit-next"
                type="date"
                required
                value={form.nextDueDate}
                onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-provider">Proveedor</Label>
            <Input
              id="edit-provider"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              placeholder="Ej. Netflix, Spotify"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              id="edit-sub"
              type="checkbox"
              checked={form.isSubscription}
              onChange={(e) => setForm({ ...form, isSubscription: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="edit-sub" className="text-sm">
              Es suscripción
            </Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
