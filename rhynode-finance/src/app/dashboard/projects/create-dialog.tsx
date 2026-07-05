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
import { useOrganizationRole } from "@/hooks/use-organization-role";
import { executeMutation } from "@/lib/offline-queue";

export function CreateProjectDialog() {
  const t = useTranslations("dashboard.projects");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "ACTIVE" as "ACTIVE" | "COMPLETED" | "ARCHIVED",
    startDate: "",
    endDate: "",
    budget: "",
    color: "#3b82f6",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    setLoading(true);
    try {
      await executeMutation(
        "/api/projects",
        "POST",
        {
          name: form.name,
          description: form.description || undefined,
          status: form.status,
          startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
          endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
          budget: form.budget ? Number(form.budget) : undefined,
          color: form.color,
        },
        {
          onSuccess: () => {
            setOpen(false);
            setForm({
              name: "",
              description: "",
              status: "ACTIVE",
              startDate: "",
              endDate: "",
              budget: "",
              color: "#3b82f6",
            });
            window.location.reload();
          },
          onError: (err) => {
            toast.error(err.message || t("createDialog.errorCreate"));
          },
        },
      );
    } finally {
      setLoading(false);
    }
  }

  const { canEdit } = useOrganizationRole();
  if (!canEdit) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t("createDialog.newProject")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("createDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="project-name">{t("createDialog.name")} *</Label>
            <Input
              id="project-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("createDialog.namePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">{t("createDialog.description")}</Label>
            <Input
              id="project-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("createDialog.descriptionPlaceholder")}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-status">{t("createDialog.status")}</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as typeof form.status })
                }
              >
                <SelectTrigger id="project-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">{t("statuses.ACTIVE" as never)}</SelectItem>
                  <SelectItem value="COMPLETED">{t("statuses.COMPLETED" as never)}</SelectItem>
                  <SelectItem value="ARCHIVED">{t("statuses.ARCHIVED" as never)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-color">{t("createDialog.color")}</Label>
              <div className="flex items-center gap-2">
                <input
                  id="project-color"
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-9 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span className="text-sm text-muted-foreground">{form.color}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-start">{t("createDialog.startDate")}</Label>
              <Input
                id="project-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-end">{t("createDialog.endDate")}</Label>
              <Input
                id="project-end"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-budget">{t("createDialog.budget")}</Label>
            <Input
              id="project-budget"
              type="number"
              min={0}
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("createDialog.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("createDialog.saving") : t("createDialog.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
