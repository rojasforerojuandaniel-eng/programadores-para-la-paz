"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PaymentLink } from "./payment-link-actions";

interface DeleteConfirmDialogProps {
  link: PaymentLink;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmDialog({
  link,
  open,
  onOpenChange,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const t = useTranslations("dashboard.paymentLinks");
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("dialogs.delete.title")}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">
          {t("dialogs.delete.confirm", { name: link.name })}
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            {t("buttons.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? t("buttons.deleting") : t("buttons.delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}