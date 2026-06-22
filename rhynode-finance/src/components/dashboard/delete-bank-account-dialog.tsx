"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("dashboard.accounts");
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const result = await deleteBankAccount(account.id);
    setLoading(false);

    if (result.success) {
      toast.success(t("deleteDialog.toastSuccess"));
      onOpenChange(false);
    } else {
      toast.error(result.error || t("deleteDialog.toastError"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("deleteDialog.title")}</DialogTitle>
          <DialogDescription className="body-default">
            {t.rich("deleteDialog.description", {
              name: account.name,
              bankName: account.bankName,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
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
            {t("bankImport.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="h-11"
          >
            {loading ? t("deleteDialog.deleting") : t("deleteDialog.confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
