"use client";

import { useState, type ReactNode } from "react";
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
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { executeMutation } from "@/lib/offline-queue";

interface CreateGoalDialogProps {
  trigger?: ReactNode;
  defaultOpen?: boolean;
  defaultValues?: {
    name?: string;
    targetAmount?: number;
    currency?: string;
    deadline?: Date;
    icon?: string;
    color?: string;
  };
}

export function CreateGoalDialog({
  trigger,
  defaultOpen = false,
  defaultValues,
}: CreateGoalDialogProps = {}) {
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("dashboard.goals");
  const [form, setForm] = useState({
    name: defaultValues?.name ?? "",
    targetAmount: defaultValues?.targetAmount
      ? String(Math.round(defaultValues.targetAmount))
      : "",
    currency: defaultValues?.currency ?? "COP",
    deadline: defaultValues?.deadline
      ? new Date(defaultValues.deadline).toISOString().split("T")[0]
      : "",
    icon: defaultValues?.icon ?? "",
    color: defaultValues?.color ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.targetAmount) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        targetAmount: Number(form.targetAmount),
        currency: form.currency,
      };
      if (form.deadline) body.deadline = form.deadline;
      if (form.icon) body.icon = form.icon;
      if (form.color) body.color = form.color;

      await executeMutation(
        "/api/personal/goals",
        "POST",
        body,
        {
          onSuccess: () => {
            trackEvent("goal_created", {
              currency: form.currency,
              hasDeadline: Boolean(form.deadline),
            });
            setOpen(false);
            setForm({
              name: "",
              targetAmount: "",
              currency: "COP",
              deadline: "",
              icon: "",
              color: "",
            });
            router.refresh();
            toast.success(t("createDialog.created"));
          },
          onError: (err) => {
            toast.error(err.message || t("createDialog.createError"));
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
        {trigger ?? (
          <Button className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("createDialog.trigger")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("createDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("createDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="goal-name">{t("createDialog.name")}</Label>
            <Input
              id="goal-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("createDialog.namePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goal-target">{t("createDialog.targetAmount")}</Label>
              <Input
                id="goal-target"
                type="number"
                min={0}
                required
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-deadline">{t("createDialog.deadline")}</Label>
              <Input
                id="goal-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goal-color">{t("createDialog.color")}</Label>
              <Input
                id="goal-color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="#00d4ff"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-icon">{t("createDialog.icon")}</Label>
              <Input
                id="goal-icon"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="Target"
              />
            </div>
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
