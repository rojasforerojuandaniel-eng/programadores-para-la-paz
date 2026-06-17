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
import type { SubscriptionItem } from "./subscription-utils";
import { frequencyLabel } from "./subscription-utils";
import { updateSubscription } from "./actions";

const FREQUENCIES = [
  "DAILY",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
] as const;

interface EditSubscriptionDialogProps {
  item: SubscriptionItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (item: SubscriptionItem) => void;
}

export function EditSubscriptionDialog({
  item,
  open,
  onOpenChange,
  onSaved,
}: EditSubscriptionDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: item.name,
    description: item.description || "",
    amount: String(item.amount),
    currency: item.currency,
    frequency: item.frequency,
    provider: item.provider || "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.amount) return;

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 0) return;

    setLoading(true);
    try {
      const result = await updateSubscription(item.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        amount,
        currency: form.currency,
        frequency: form.frequency as (typeof FREQUENCIES)[number],
        provider: form.provider.trim() || undefined,
      });

      if (result.success) {
        toast.success("Suscripción actualizada");
        onSaved?.({
          ...item,
          name: form.name.trim(),
          description: form.description.trim() || null,
          amount,
          currency: form.currency,
          frequency: form.frequency,
          provider: form.provider.trim() || null,
        });
        router.refresh();
      } else {
        toast.error(result.error || "No se pudo actualizar");
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
          <DialogTitle className="heading-card">Editar suscripción</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="sub-name">Nombre</Label>
            <Input
              id="sub-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sub-desc">Descripción</Label>
            <Input
              id="sub-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sub-amount">Monto</Label>
              <Input
                id="sub-amount"
                type="number"
                required
                min={0}
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-frequency">Frecuencia</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => setForm({ ...form, frequency: v })}
              >
                <SelectTrigger id="sub-frequency">
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="sub-provider">Proveedor</Label>
            <Input
              id="sub-provider"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              placeholder="Ej. Netflix, Spotify"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
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
