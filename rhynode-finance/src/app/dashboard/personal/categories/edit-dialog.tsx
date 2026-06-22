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

const typeOptions: { value: CategoryType; labelKey: string }[] = [
  { value: "INCOME", labelKey: "types.INCOME" },
  { value: "EXPENSE", labelKey: "types.EXPENSE" },
  { value: "TRANSFER", labelKey: "types.TRANSFER" },
];

export function EditCategoryDialog({
  category,
  categories,
  open,
  onOpenChange,
}: EditCategoryDialogProps) {
  const t = useTranslations("dashboard.categories");
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
      toast.success(t("dialogs.edit.updated"));
      onOpenChange(false);
    } else {
      toast.error(result.error || t("dialogs.edit.error"));
    }
  }

  const parentCandidates = categories.filter((c) => c.id !== category.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("dialogs.edit.title")}</DialogTitle>
          <DialogDescription className="body-default">
            {t("dialogs.edit.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-cat-name">{t("dialogs.edit.nameLabel")}</Label>
            <Input
              id="edit-cat-name"
              required
              aria-required="true"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("dialogs.edit.namePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-cat-type">{t("dialogs.edit.typeLabel")}</Label>
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
                      {t(opt.labelKey as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat-parent">{t("dialogs.edit.parentLabel")}</Label>
              <Select
                value={form.parentId}
                onValueChange={(v) => setForm({ ...form, parentId: v })}
              >
                <SelectTrigger id="edit-cat-parent">
                  <SelectValue placeholder={t("dialogs.edit.parentNone")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("dialogs.edit.parentNone")}</SelectItem>
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
              <Label htmlFor="edit-cat-color">{t("dialogs.edit.colorLabel")}</Label>
              <Input
                id="edit-cat-color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="#00d4ff"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat-icon">{t("dialogs.edit.iconLabel")}</Label>
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
              {t("dialogs.edit.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("dialogs.edit.saving") : t("dialogs.edit.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}