"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TransactionForm } from "@/components/dashboard/transaction-form";
import { useOrganizationRole } from "@/hooks/use-organization-role";

interface CreateTransactionDialogProps {
  onCreate: () => void;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

export function CreateTransactionDialog({
  onCreate,
  trigger,
  defaultOpen = false,
}: CreateTransactionDialogProps) {
  const [open, setOpen] = useState(defaultOpen);

  function handleSuccess() {
    setOpen(false);
    onCreate();
  }

  const { canEdit } = useOrganizationRole();
  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva Transacción
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full max-w-[calc(100%-1rem)] p-4 sm:max-w-lg sm:p-6">
        <DialogHeader>
          <DialogTitle className="heading-card">Nueva Transacción</DialogTitle>
          <DialogDescription>
            Registra un ingreso, gasto, transferencia o ajuste.
          </DialogDescription>
        </DialogHeader>
        <TransactionForm onSuccess={handleSuccess} onCancel={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
