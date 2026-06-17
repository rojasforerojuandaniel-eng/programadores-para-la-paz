"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins } from "lucide-react";
import { toast } from "sonner";

interface RecordPaymentDialogProps {
  debtId: string;
  debtName: string;
  remaining: number;
  currency: string;
  trigger?: React.ReactNode;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function RecordPaymentDialog({
  debtId,
  debtName,
  remaining,
  currency,
  trigger,
}: RecordPaymentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payment = Number(amount);
    if (!Number.isFinite(payment) || payment <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (payment > remaining) {
      toast.error(`El pago no puede superar ${formatCurrency(remaining, currency)}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/personal/debts/${debtId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: payment }),
      });

      if (res.ok) {
        toast.success("Pago registrado");
        router.refresh();
        setOpen(false);
        setAmount("");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "No se pudo registrar el pago");
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
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Coins className="h-4 w-4" aria-hidden="true" />
            Registrar pago
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-card">Registrar pago</DialogTitle>
          <DialogDescription>
            {debtName} · saldo restante{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(remaining, currency)}
            </span>
            <span className="block pt-1 text-xs text-muted-foreground">
              Se creará una transacción asociada en tu historial.
            </span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor={`payment-amount-${debtId}`}>Monto del pago</Label>
            <Input
              id={`payment-amount-${debtId}`}
              type="number"
              min={0.01}
              step={0.01}
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={formatCurrency(Math.min(remaining, 100000), currency)}
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Máximo {formatCurrency(remaining, currency)}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Registrando..." : "Registrar pago"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
