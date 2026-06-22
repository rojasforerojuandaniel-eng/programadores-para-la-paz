"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  /** Controlled open state (used by the voice input to open after parsing). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultType?: "INCOME" | "EXPENSE" | "TRANSFER" | "ADJUSTMENT";
  defaultAmount?: string;
  defaultDescription?: string;
  defaultCategory?: string;
}

export function CreateTransactionDialog({
  onCreate,
  trigger,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  defaultType,
  defaultAmount,
  defaultDescription,
  defaultCategory,
}: CreateTransactionDialogProps) {
  const t = useTranslations("dashboard.transactions");
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
  };

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
            {t("newTransaction")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full max-w-[calc(100%-1rem)] p-4 sm:max-w-lg sm:p-6">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("newTransaction")}</DialogTitle>
          <DialogDescription>
            {t("dialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm onSuccess={handleSuccess} onCancel={() => setOpen(false)} defaultType={defaultType} defaultAmount={defaultAmount} defaultDescription={defaultDescription} defaultCategory={defaultCategory} />
      </DialogContent>
    </Dialog>
  );
}
