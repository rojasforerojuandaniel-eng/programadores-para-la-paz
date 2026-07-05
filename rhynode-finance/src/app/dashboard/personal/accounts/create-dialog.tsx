"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const typeLabelKeys: Record<string, string> = {
  CHECKING: "dialog.types.CHECKING",
  SAVINGS: "dialog.types.SAVINGS",
  CREDIT: "dialog.types.CREDIT",
  INVESTMENT: "dialog.types.INVESTMENT",
  CASH: "dialog.types.CASH",
  OTHER: "dialog.types.OTHER",
};

export function CreateAccountDialog() {
  const t = useTranslations("dashboard.personalAccounts");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    type: "CHECKING",
    balance: "",
    currency: "COP",
    color: "",
    icon: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/personal/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          balance: Number(form.balance) || 0,
          currency: form.currency,
          color: form.color || undefined,
          icon: form.icon || undefined,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setForm({ name: "", type: "CHECKING", balance: "", currency: "COP", color: "", icon: "" });
        router.refresh();
        toast.success(t("dialog.toast.created"));
      } else {
        toast.error(t("dialog.toast.createError"));
      }
    } catch {
      toast.error(t("dialog.toast.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t("dialog.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("dialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="acc-name">{t("dialog.labels.name")}</Label>
            <Input
              id="acc-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("dialog.placeholders.name")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="acc-type">{t("dialog.labels.type")}</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v })}
              >
                <SelectTrigger id="acc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CHECKING">{t(typeLabelKeys.CHECKING as never)}</SelectItem>
                  <SelectItem value="SAVINGS">{t(typeLabelKeys.SAVINGS as never)}</SelectItem>
                  <SelectItem value="CREDIT">{t(typeLabelKeys.CREDIT as never)}</SelectItem>
                  <SelectItem value="INVESTMENT">{t(typeLabelKeys.INVESTMENT as never)}</SelectItem>
                  <SelectItem value="CASH">{t(typeLabelKeys.CASH as never)}</SelectItem>
                  <SelectItem value="OTHER">{t(typeLabelKeys.OTHER as never)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="acc-balance">{t("dialog.labels.initialBalance")}</Label>
              <Input
                id="acc-balance"
                type="number"
                min={0}
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="acc-currency">{t("dialog.labels.currency")}</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm({ ...form, currency: v })}
              >
                <SelectTrigger id="acc-currency">
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
            <div className="space-y-2">
              <Label htmlFor="acc-color">{t("dialog.labels.color")}</Label>
              <Input
                id="acc-color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="#00d4ff"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="acc-icon">{t("dialog.labels.icon")}</Label>
            <Input
              id="acc-icon"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder={t("dialog.labels.iconPlaceholder")}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("dialog.buttons.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("dialog.buttons.saving") : t("dialog.buttons.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}