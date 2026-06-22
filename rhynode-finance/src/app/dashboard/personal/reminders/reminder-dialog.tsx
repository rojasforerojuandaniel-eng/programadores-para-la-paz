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
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { executeMutation } from "@/lib/offline-queue";

export interface ReminderRow {
  id: string;
  title: string;
  message: string;
  scheduledAt: string;
  repeat: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  active: boolean;
  read: boolean;
  lastSentAt?: string;
}

interface ReminderDialogProps {
  reminder?: ReminderRow;
  onSuccess: () => void;
  defaultOpen?: boolean;
}

const repeatLabelKeys: Record<ReminderRow["repeat"], string> = {
  NONE: "repeats.NONE",
  DAILY: "repeats.DAILY",
  WEEKLY: "repeats.WEEKLY",
  MONTHLY: "repeats.MONTHLY",
};

function toLocalInputValue(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalInputValue(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return date.toISOString();
}

export function ReminderDialog({ reminder, onSuccess, defaultOpen = false }: ReminderDialogProps) {
  const t = useTranslations("dashboard.reminders");
  const isEdit = Boolean(reminder);
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: reminder?.title ?? "",
    message: reminder?.message ?? "",
    scheduledAt: toLocalInputValue(reminder?.scheduledAt) || new Date().toISOString().slice(0, 16),
    repeat: reminder?.repeat ?? "NONE",
    active: reminder?.active ?? true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim() || !form.scheduledAt) return;

    setLoading(true);
    try {
      const url = isEdit ? `/api/personal/reminders/${reminder?.id}` : "/api/personal/reminders";
      const method = isEdit ? "PATCH" : "POST";
      await executeMutation(
        url,
        method,
        {
          title: form.title,
          message: form.message,
          scheduledAt: fromLocalInputValue(form.scheduledAt),
          repeat: form.repeat,
          active: form.active,
        },
        {
          onSuccess: () => {
            setOpen(false);
            onSuccess();
            toast.success(isEdit ? t("toast.updated") : t("toast.created"));
          },
          onError: (err) => {
            toast.error(err.message || t("toast.saveError"));
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
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label={t("aria.edit")}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {t("dialog.trigger")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">
            {isEdit ? t("dialog.editTitle") : t("dialog.title")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="reminder-title">{t("dialog.labels.title")}</Label>
            <Input
              id="reminder-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t("dialog.placeholders.title")}
              required
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reminder-message">{t("dialog.labels.message")}</Label>
            <Input
              id="reminder-message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder={t("dialog.placeholders.message")}
              required
              maxLength={500}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reminder-date">{t("dialog.labels.scheduledAt")}</Label>
              <Input
                id="reminder-date"
                type="datetime-local"
                required
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-repeat">{t("dialog.labels.repeat")}</Label>
              <Select
                value={form.repeat}
                onValueChange={(v) => setForm({ ...form, repeat: v as typeof form.repeat })}
              >
                <SelectTrigger id="reminder-repeat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">{t(repeatLabelKeys.NONE as never)}</SelectItem>
                  <SelectItem value="DAILY">{t(repeatLabelKeys.DAILY as never)}</SelectItem>
                  <SelectItem value="WEEKLY">{t(repeatLabelKeys.WEEKLY as never)}</SelectItem>
                  <SelectItem value="MONTHLY">{t(repeatLabelKeys.MONTHLY as never)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Switch
              id="reminder-active"
              checked={form.active}
              onCheckedChange={(checked) => setForm({ ...form, active: checked })}
            />
            <Label htmlFor="reminder-active" className="text-sm">{form.active ? t("dialog.labels.active") : t("dialog.labels.inactive")}</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("dialog.buttons.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("dialog.buttons.saving") : isEdit ? t("dialog.buttons.save") : t("dialog.buttons.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}