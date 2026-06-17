"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { PaymentLink } from "./payment-link-actions";

function formatDateInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

interface EditPaymentLinkDialogProps {
  link: PaymentLink;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function EditPaymentLinkDialog({
  link,
  open,
  onOpenChange,
  onRefresh,
}: EditPaymentLinkDialogProps) {
  const [form, setForm] = useState({
    name: link.name,
    description: link.description || "",
    amount: String(link.amount),
    maxPayments: link.maxPayments ? String(link.maxPayments) : "",
    expiresAt: formatDateInput(link.expiresAt),
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description || undefined,
        amount: Number(form.amount),
      };
      if (form.maxPayments) {
        body.maxPayments = Number(form.maxPayments);
      } else {
        body.maxPayments = null;
      }
      if (form.expiresAt) {
        body.expiresAt = new Date(form.expiresAt).toISOString();
      } else {
        body.expiresAt = null;
      }

      const response = await fetch(`/api/payment-links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Update failed");
      toast.success("Link actualizado");
      onRefresh();
      onOpenChange(false);
    } catch {
      toast.error("No se pudo actualizar el link");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">
            Editar Link de Cobro
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="pl-edit-name">Nombre</Label>
            <Input
              id="pl-edit-name"
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pl-edit-desc">Descripción</Label>
            <Input
              id="pl-edit-desc"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pl-edit-amount">Monto</Label>
              <Input
                id="pl-edit-amount"
                type="number"
                required
                min={0}
                value={form.amount}
                onChange={(event) =>
                  setForm({ ...form, amount: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pl-edit-max">Límite de pagos</Label>
              <Input
                id="pl-edit-max"
                type="number"
                min={1}
                value={form.maxPayments}
                placeholder="Sin límite"
                onChange={(event) =>
                  setForm({ ...form, maxPayments: event.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pl-edit-expires">Fecha de expiración</Label>
            <Input
              id="pl-edit-expires"
              type="date"
              value={form.expiresAt}
              onChange={(event) =>
                setForm({ ...form, expiresAt: event.target.value })
              }
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
