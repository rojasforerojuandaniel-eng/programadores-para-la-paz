"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Plus } from "lucide-react";
import { toast } from "sonner";

const FREQUENCIES = [
  { value: "MONTHLY", label: "Mensual" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "YEARLY", label: "Anual" },
  { value: "BIWEEKLY", label: "Quincenal" },
  { value: "QUARTERLY", label: "Trimestral" },
  { value: "DAILY", label: "Diario" },
];

export function CreateSubscriptionDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    amount: "",
    frequency: "MONTHLY",
    nextDueDate: new Date().toISOString().split("T")[0],
    category: "",
    provider: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.amount || !form.nextDueDate) return;

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/personal/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          amount,
          frequency: form.frequency,
          nextDueDate: new Date(form.nextDueDate).toISOString(),
          category: form.category || undefined,
          provider: form.provider || undefined,
          currency: "COP",
        }),
      });

      if (res.ok) {
        setOpen(false);
        setForm({
          name: "",
          amount: "",
          frequency: "MONTHLY",
          nextDueDate: new Date().toISOString().split("T")[0],
          category: "",
          provider: "",
        });
        router.refresh();
        toast.success("Suscripción creada");
      } else {
        toast.error("Error al crear suscripción");
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva suscripción
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">Añadir suscripción</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="sub-name">Nombre *</Label>
            <Input
              id="sub-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej. Netflix, Gimnasio"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sub-amount">Monto *</Label>
              <Input
                id="sub-amount"
                type="number"
                required
                min={0}
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cal-sub-frequency">Frecuencia *</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => setForm({ ...form, frequency: v })}
              >
                <SelectTrigger id="cal-sub-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sub-next">Próxima fecha de pago *</Label>
              <Input
                id="sub-next"
                type="date"
                required
                value={form.nextDueDate}
                onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-category">Categoría</Label>
              <Input
                id="sub-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ej. Entretenimiento"
              />
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
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
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
