"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { executeMutation } from "@/lib/offline-queue";

interface Category {
  id: string;
  name: string;
}

export function CreateCategoryDialog({ categories }: { categories: Category[] }) {
  const t = useTranslations("dashboard.categories");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    type: "EXPENSE",
    parentId: "",
    icon: "",
    color: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await executeMutation(
        "/api/personal/categories",
        "POST",
        {
          name: form.name,
          type: form.type,
          parentId: form.parentId || undefined,
          icon: form.icon || undefined,
          color: form.color || undefined,
        },
        {
          onSuccess: () => {
            setOpen(false);
            setForm({ name: "", type: "EXPENSE", parentId: "", icon: "", color: "" });
            router.refresh();
            toast.success(t("dialogs.create.created"));
          },
          onError: (err) => {
            toast.error(err.message || t("dialogs.create.error"));
          },
        },
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("dialogs.create.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("dialogs.create.title")}</DialogTitle>
          <DialogDescription>
            {t("dialogs.create.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="cat-name">{t("dialogs.create.nameLabel")}</Label>
            <Input
              id="cat-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("dialogs.create.namePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cat-type">{t("dialogs.create.typeLabel")}</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v })}
              >
                <SelectTrigger id="cat-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">{t("types.INCOME" as never)}</SelectItem>
                  <SelectItem value="EXPENSE">{t("types.EXPENSE" as never)}</SelectItem>
                  <SelectItem value="TRANSFER">{t("types.TRANSFER" as never)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-parent">{t("dialogs.create.parentLabel")}</Label>
              <Select
                value={form.parentId}
                onValueChange={(v) => setForm({ ...form, parentId: v })}
              >
                <SelectTrigger id="cat-parent">
                  <SelectValue placeholder={t("dialogs.create.parentNone")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
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
              <Label htmlFor="cat-color">{t("dialogs.create.colorLabel")}</Label>
              <Input
                id="cat-color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="#00d4ff"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-icon">{t("dialogs.create.iconLabel")}</Label>
              <Input
                id="cat-icon"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="Tags"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("dialogs.create.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("dialogs.create.saving") : t("dialogs.create.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}