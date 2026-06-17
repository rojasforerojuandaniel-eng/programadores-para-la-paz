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
import { updateCategory } from "./actions";
import type { CategoryRow, CategoryType } from "./types";

interface EditCategoryDialogProps {
  category: CategoryRow;
  categories: CategoryRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeOptions: { value: CategoryType; label: string }[] = [
  { value: "INCOME", label: "Ingreso" },
  { value: "EXPENSE", label: "Gasto" },
  { value: "TRANSFER", label: "Transferencia" },
];

export function EditCategoryDialog({
  category,
  categories,
  open,
  onOpenChange,
}: EditCategoryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: category.name,
    type: category.type,
    parentId: category.parentId || "none",
    icon: category.icon || "",
    color: category.color || "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setLoading(true);
    const result = await updateCategory(category.id, {
      name: form.name.trim(),
      type: form.type,
      parentId: form.parentId === "none" ? undefined : form.parentId,
      icon: form.icon || undefined,
      color: form.color || undefined,
    });
    setLoading(false);

    if (result.success) {
      toast.success("Categoría actualizada");
      onOpenChange(false);
    } else {
      toast.error(result.error || "Error al actualizar la categoría");
    }
  }

  const parentCandidates = categories.filter((c) => c.id !== category.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">Editar Categoría</DialogTitle>
          <DialogDescription className="body-default">
            Modifica los datos de la categoría seleccionada.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-cat-name">Nombre *</Label>
            <Input
              id="edit-cat-name"
              required
              aria-required="true"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej. Alimentación"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-cat-type">Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as CategoryType })}
              >
                <SelectTrigger id="edit-cat-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat-parent">Categoría padre</Label>
              <Select
                value={form.parentId}
                onValueChange={(v) => setForm({ ...form, parentId: v })}
              >
                <SelectTrigger id="edit-cat-parent">
                  <SelectValue placeholder="Ninguna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguna</SelectItem>
                  {parentCandidates.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-cat-color">Color</Label>
              <Input
                id="edit-cat-color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="#00d4ff"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat-icon">Icono (nombre Lucide)</Label>
              <Input
                id="edit-cat-icon"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="Tags"
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
