"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  InvoiceForm,
  type InvoiceFormDefaultValues,
} from "@/components/dashboard/invoice-form";
import { useOrganizationRole } from "@/hooks/use-organization-role";

export interface CreateInvoiceDialogProps {
  onCreate: () => void;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultValues?: InvoiceFormDefaultValues;
}

export function CreateInvoiceDialog({
  onCreate,
  trigger,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  defaultValues,
}: CreateInvoiceDialogProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const t = useTranslations("dashboard.invoices");

  function handleSuccess() {
    setOpen(false);
    onCreate();
  }

  const { canEdit } = useOrganizationRole();
  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined ? (
        trigger !== null ? (
          <DialogTrigger asChild>{trigger}</DialogTrigger>
        ) : null
      ) : (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {t("newInvoice")}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="w-full max-w-[calc(100%-1rem)] p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("newInvoice")}</DialogTitle>
        </DialogHeader>
        <InvoiceForm
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
          defaultValues={defaultValues}
        />
      </DialogContent>
    </Dialog>
  );
}
