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

export function CreatePaymentLinkDialog({ onCreate }: { onCreate: () => void }) {
  const t = useTranslations("dashboard.paymentLinks");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    amount: "",
    currency: "COP",
    urlSlug: "",
    maxPayments: "",
    expiresAt: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.amount || !form.urlSlug.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          maxPayments: form.maxPayments ? Number(form.maxPayments) : undefined,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setForm({ name: "", description: "", amount: "", currency: "COP", urlSlug: "", maxPayments: "", expiresAt: "" });
        onCreate();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t("toasts.createError"));
      }
    } catch {
      toast.error(t("toasts.networkError"));
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
          {t("buttons.new")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("dialogs.create.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="pl-name">{t("fields.nameRequired")}</Label>
            <Input
              id="pl-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("placeholders.nameExample")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pl-desc">{t("fields.description")}</Label>
            <Input
              id="pl-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("placeholders.description")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pl-amount">{t("fields.amountRequired")}</Label>
              <Input
                id="pl-amount"
                type="number"
                required
                min={0}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pl-currency">{t("fields.currency")}</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm({ ...form, currency: v })}
              >
                <SelectTrigger id="pl-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="MXN">MXN</SelectItem>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pl-slug">{t("fields.urlSlugRequired")}</Label>
            <Input
              id="pl-slug"
              required
              value={form.urlSlug}
              onChange={(e) => setForm({ ...form, urlSlug: e.target.value })}
              placeholder={t("placeholders.urlSlug")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pl-max">{t("fields.maxPayments")}</Label>
              <Input
                id="pl-max"
                type="number"
                min={1}
                value={form.maxPayments}
                onChange={(e) => setForm({ ...form, maxPayments: e.target.value })}
                placeholder={t("placeholders.noLimit")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pl-expires">{t("fields.expiresAt")}</Label>
              <Input
                id="pl-expires"
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("buttons.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("buttons.saving") : t("buttons.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}