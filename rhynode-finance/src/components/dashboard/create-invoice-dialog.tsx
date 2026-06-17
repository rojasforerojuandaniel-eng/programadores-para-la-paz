"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { InvoiceForm } from "@/components/dashboard/invoice-form";
import { useOrganizationRole } from "@/hooks/use-organization-role";

interface CreateInvoiceDialogProps {
  onCreate: () => void;
  trigger?: React.ReactNode;
}

export function CreateInvoiceDialog({ onCreate, trigger }: CreateInvoiceDialogProps) {
  const [open, setOpen] = useState(false);

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
            <Plus className="h-4 w-4" />
            Nueva Factura
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full max-w-[calc(100%-1rem)] p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="heading-card">Nueva Factura</DialogTitle>
        </DialogHeader>
        <InvoiceForm onSuccess={handleSuccess} onCancel={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
