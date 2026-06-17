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
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface AddSavingsDialogProps {
  goalId: string;
  goalName: string;
  currency: string;
}

export function AddSavingsDialog({
  goalId,
  goalName,
  currency,
}: AddSavingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!amount || value <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/personal/goals/${goalId}/savings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value }),
      });

      if (res.ok) {
        toast.success("Ahorro añadido");
        setAmount("");
        setOpen(false);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "No se pudo añadir el ahorro");
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
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Añadir ahorro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-card">
            Añadir ahorro a &ldquo;{goalName}&rdquo;
          </DialogTitle>
          <DialogDescription>
            Ingresa el monto que deseas sumar al ahorro de esta meta.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="savings-amount">Monto ({currency}) *</Label>
            <Input
              id="savings-amount"
              type="number"
              min={0.01}
              step={0.01}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Este monto se suma al ahorro actual de la meta.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Añadir ahorro"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
