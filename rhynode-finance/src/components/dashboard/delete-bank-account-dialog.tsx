"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { deleteBankAccount } from "@/app/dashboard/accounts/actions";
import type { BankAccountRow } from "./bank-account-actions";

interface DeleteBankAccountDialogProps {
  account: BankAccountRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteBankAccountDialog({
  account,
  open,
  onOpenChange,
}: DeleteBankAccountDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const result = await deleteBankAccount(account.id);
    setLoading(false);

    if (result.success) {
      toast.success("Cuenta eliminada");
      onOpenChange(false);
    } else {
      toast.error(result.error || "Error al eliminar la cuenta");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-card">Eliminar cuenta</DialogTitle>
          <DialogDescription className="body-default">
            Estás a punto de eliminar <strong>{account.name}</strong> de{" "}
            {account.bankName}. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-11"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="h-11"
          >
            {loading ? "Eliminando..." : "Eliminar cuenta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
