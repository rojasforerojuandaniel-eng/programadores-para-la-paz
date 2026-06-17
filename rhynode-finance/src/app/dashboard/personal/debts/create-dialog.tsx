"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export function CreateDebtDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    type: "OWE",
    counterparty: "",
    principalAmount: "",
    interestRate: "",
    remainingAmount: "",
    currency: "COP",
    dueDate: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.principalAmount) return;
    setLoading(true);
    try {
      const principal = Number(form.principalAmount);
      const remaining = form.remainingAmount ? Number(form.remainingAmount) : principal;
      await executeMutation(
        "/api/personal/debts",
        "POST",
        {
          name: form.name,
          type: form.type,
          counterparty: form.counterparty || undefined,
          principalAmount: principal,
          interestRate: form.interestRate ? Number(form.interestRate) : undefined,
          remainingAmount: remaining,
          currency: form.currency,
          dueDate: form.dueDate || undefined,
          notes: form.notes || undefined,
        },
        {
          onSuccess: () => {
            setOpen(false);
            setForm({
              name: "", type: "OWE", counterparty: "", principalAmount: "",
              interestRate: "", remainingAmount: "", currency: "COP", dueDate: "", notes: "",
            });
            router.refresh();
            toast.success("Deuda creada");
          },
          onError: (err) => {
            toast.error(err.message || "Error al crear deuda");
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
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nueva Deuda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">Nueva Deuda</DialogTitle>
          <DialogDescription>
            Registra un préstamo u obligación pendiente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="debt-name">Nombre *</Label>
            <Input
              id="debt-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej. Préstamo bancario"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="debt-type">Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v })}
              >
                <SelectTrigger id="debt-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWE">Debo</SelectItem>
                  <SelectItem value="OWED">Me deben</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-counterparty">Contraparte</Label>
              <Input
                id="debt-counterparty"
                value={form.counterparty}
                onChange={(e) => setForm({ ...form, counterparty: e.target.value })}
                placeholder="Ej. Banco XYZ"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="debt-principal">Monto principal *</Label>
              <Input
                id="debt-principal"
                type="number"
                required
                min={0}
                value={form.principalAmount}
                onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-remaining">Monto restante</Label>
              <Input
                id="debt-remaining"
                type="number"
                min={0}
                value={form.remainingAmount}
                onChange={(e) => setForm({ ...form, remainingAmount: e.target.value })}
                placeholder="Igual al principal"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="debt-interest">Tasa de interés (%)</Label>
              <Input
                id="debt-interest"
                type="number"
                step="0.01"
                min={0}
                value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debt-currency">Moneda</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm({ ...form, currency: v })}
              >
                <SelectTrigger id="debt-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="MXN">MXN</SelectItem>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="debt-due">Fecha de vencimiento</Label>
            <Input
              id="debt-due"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="debt-notes">Notas</Label>
            <Input
              id="debt-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notas adicionales"
            />
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
