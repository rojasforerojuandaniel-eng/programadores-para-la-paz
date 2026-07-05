"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

import type { Invoice } from "@/types";

const statusOptions = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED", "PARTIAL"];

interface EditInvoiceDialogProps {
  invoice: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditInvoiceDialog({
  invoice,
  open,
  onOpenChange,
  onSuccess,
}: EditInvoiceDialogProps) {
  const t = useTranslations("dashboard.invoices");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    status: invoice.status,
    dueDate: invoice.dueDate
      ? new Date(invoice.dueDate).toISOString().split("T")[0]
      : "",
    notes: invoice.notes ?? "",
    terms: invoice.terms ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        status: form.status,
        notes: form.notes,
        terms: form.terms,
      };
      if (form.dueDate) {
        body.dueDate = new Date(form.dueDate).toISOString();
      }

      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(t("editDialog.toasts.updated"));
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error(t("editDialog.toasts.updateError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary" aria-hidden="true">
              <Pencil className="h-4 w-4" />
            </div>
            <DialogTitle className="heading-card">{t("editDialog.title")}</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">{invoice.number}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-inv-status">{t("columns.status")}</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger id="edit-inv-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`statuses.${value}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-inv-due">{t("form.fields.dueDate")}</Label>
              <Input
                id="edit-inv-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-inv-notes">{t("form.fields.notes")}</Label>
            <Input
              id="edit-inv-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={t("form.placeholders.notes")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-inv-terms">{t("form.fields.terms")}</Label>
            <Input
              id="edit-inv-terms"
              value={form.terms}
              onChange={(e) => setForm({ ...form, terms: e.target.value })}
              placeholder={t("form.placeholders.terms")}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("form.saving") : t("editDialog.saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
