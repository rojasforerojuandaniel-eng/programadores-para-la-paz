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
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const result = await deleteCategory(category.id);
    setLoading(false);

    if (result.success) {
      toast.success("Categoría eliminada");
      onOpenChange(false);
    } else {
      toast.error(result.error || "Error al eliminar la categoría");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-card">Eliminar categoría</DialogTitle>
          <DialogDescription className="body-default">
            Estás a punto de eliminar <strong>{category.name}</strong>. Esta acción no se puede deshacer.
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
            {loading ? "Eliminando..." : "Eliminar categoría"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
