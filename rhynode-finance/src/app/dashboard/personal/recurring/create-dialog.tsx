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
import { executeMutation } from "@/lib/offline-queue";

export function CreateRecurringDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    amount: "",
    type: "EXPENSE",
    categoryId: "",
    accountId: "",
    frequency: "MONTHLY",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    nextDueDate: new Date().toISOString().split("T")[0],
    isSubscription: false,
    provider: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.amount || !form.nextDueDate) return;
    setLoading(true);
    try {
      await executeMutation(
        "/api/personal/recurring",
        "POST",
        {
          name: form.name,
          description: form.description || undefined,
          amount: Number(form.amount),
          type: form.type,
          categoryId: form.categoryId || undefined,
          accountId: form.accountId || undefined,
          frequency: form.frequency,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          nextDueDate: form.nextDueDate,
          isSubscription: form.isSubscription,
          provider: form.provider || undefined,
        },
        {
          onSuccess: () => {
            setOpen(false);
            setForm({
              name: "", description: "", amount: "", type: "EXPENSE",
              categoryId: "", accountId: "", frequency: "MONTHLY",
              startDate: new Date().toISOString().split("T")[0],
              endDate: "", nextDueDate: new Date().toISOString().split("T")[0],
              isSubscription: false, provider: "",
            });
            router.refresh();
            toast.success("Transacción recurrente creada");
          },
          onError: (err) => {
            toast.error(err.message || "Error al crear transacción recurrente");
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
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Recurrente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">Nueva Transacción Recurrente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="rec-name">Nombre *</Label>
            <Input
              id="rec-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej. Netflix, Alquiler"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rec-desc">Descripción</Label>
            <Input
              id="rec-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descripción opcional"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rec-amount">Monto *</Label>
              <Input
                id="rec-amount"
                type="number"
                required
                min={0}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec-type">Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v })}
              >
                <SelectTrigger id="rec-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Gasto</SelectItem>
                  <SelectItem value="INCOME">Ingreso</SelectItem>
                  <SelectItem value="TRANSFER">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rec-freq">Frecuencia</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => setForm({ ...form, frequency: v })}
              >
                <SelectTrigger id="rec-freq">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Diaria</SelectItem>
                  <SelectItem value="WEEKLY">Semanal</SelectItem>
                  <SelectItem value="BIWEEKLY">Quincenal</SelectItem>
                  <SelectItem value="MONTHLY">Mensual</SelectItem>
                  <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                  <SelectItem value="YEARLY">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec-next">Próximo vencimiento *</Label>
              <Input
                id="rec-next"
                type="date"
                required
                value={form.nextDueDate}
                onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rec-start">Fecha inicio</Label>
              <Input
                id="rec-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rec-end">Fecha fin</Label>
              <Input
                id="rec-end"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rec-provider">Proveedor</Label>
            <Input
              id="rec-provider"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              placeholder="Ej. Netflix, Spotify"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              id="rec-sub"
              type="checkbox"
              checked={form.isSubscription}
              onChange={(e) => setForm({ ...form, isSubscription: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="rec-sub" className="text-sm">Es suscripción</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
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
