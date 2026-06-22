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
import { deleteCategory } from "./actions";
import type { CategoryRow } from "./types";

interface DeleteCategoryDialogProps {
  category: CategoryRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteCategoryDialog({
  category,
  open,
  onOpenChange,
}: DeleteCategoryDialogProps) {
  const t = useTranslations("dashboard.categories");
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const result = await deleteCategory(category.id);
    setLoading(false);

    if (result.success) {
      toast.success(t("dialogs.delete.deleted"));
      onOpenChange(false);
    } else {
      toast.error(result.error || t("dialogs.delete.error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("dialogs.delete.title")}</DialogTitle>
          <DialogDescription className="body-default">
            {t.rich("dialogs.delete.confirm", {
              name: category.name,
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
            {t("dialogs.delete.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="h-11"
          >
            {loading ? t("dialogs.delete.deleting") : t("dialogs.delete.confirmButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}