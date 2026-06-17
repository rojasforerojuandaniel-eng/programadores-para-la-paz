"use client";

import { useState } from "react";
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
import { updateBankAccount } from "@/app/dashboard/accounts/actions";
import type { BankAccountRow } from "./bank-account-actions";

interface EditBankAccountDialogProps {
  account: BankAccountRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBankAccountDialog({
  account,
  open,
  onOpenChange,
}: EditBankAccountDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: account.name,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    type: account.type,
    currency: account.currency,
    balance: account.balance.toString(),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.bankName.trim()) return;

    setLoading(true);
    const result = await updateBankAccount(account.id, {
      name: form.name.trim(),
      bankName: form.bankName.trim(),
      accountNumber: form.accountNumber.trim(),
      type: form.type,
      currency: form.currency,
      balance: Number(form.balance) || 0,
    });
    setLoading(false);

    if (result.success) {
      toast.success("Cuenta actualizada");
      onOpenChange(false);
    } else {
      toast.error(result.error || "Error al actualizar la cuenta");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">Editar Cuenta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-ba-name">Nombre de la cuenta *</Label>
            <Input
              id="edit-ba-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej. Cuenta Corriente Principal"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-ba-bank">Banco *</Label>
              <Input
                id="edit-ba-bank"
                required
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                placeholder="Ej. Bancolombia"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ba-number">Número (últimos 4)</Label>
              <Input
                id="edit-ba-number"
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                placeholder="****1234"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="edit-ba-type">Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    type: v as "CHECKING" | "SAVINGS" | "CREDIT" | "VIRTUAL",
                  })
                }
              >
                <SelectTrigger id="edit-ba-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHECKING">Corriente</SelectItem>
                  <SelectItem value="SAVINGS">Ahorros</SelectItem>
                  <SelectItem value="CREDIT">Crédito</SelectItem>
                  <SelectItem value="VIRTUAL">Virtual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ba-currency">Moneda</Label>
              <Select
                value={form.currency}
                onValueChange={(v) =>
                  setForm({ ...form, currency: v as "COP" | "MXN" | "BRL" | "USD" })
                }
              >
                <SelectTrigger id="edit-ba-currency">
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
            <div className="space-y-2">
              <Label htmlFor="edit-ba-balance">Saldo</Label>
              <Input
                id="edit-ba-balance"
                type="number"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                placeholder="0"
              />
            </div>
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
              {loading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
