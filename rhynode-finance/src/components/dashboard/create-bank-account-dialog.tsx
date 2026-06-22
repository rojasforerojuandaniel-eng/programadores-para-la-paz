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

const typeKeys = ["CHECKING", "SAVINGS", "CREDIT", "VIRTUAL"] as const;

export function CreateBankAccountDialog({ onCreate }: { onCreate: () => void }) {
  const t = useTranslations("dashboard.accounts");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    bankName: "",
    accountNumber: "",
    type: "CHECKING" as "CHECKING" | "SAVINGS" | "CREDIT" | "VIRTUAL",
    currency: "COP",
    balance: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.bankName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          balance: Number(form.balance) || 0,
        }),
      });
      if (res.ok) {
        setOpen(false);
        setForm({ name: "", bankName: "", accountNumber: "", type: "CHECKING", currency: "COP", balance: "" });
        onCreate();
      } else {
        toast.error(t("createDialog.toastError"));
      }
    } catch {
      toast.error(t("createDialog.toastNetworkError"));
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
          {t("createDialog.triggerButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("createDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="ba-name">{t("createDialog.nameLabel")}</Label>
            <Input
              id="ba-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("createDialog.namePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ba-bank">{t("createDialog.bankLabel")}</Label>
              <Input
                id="ba-bank"
                required
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                placeholder={t("createDialog.bankPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ba-number">{t("createDialog.numberLabel")}</Label>
              <Input
                id="ba-number"
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                placeholder="****1234"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ba-type">{t("table.type")}</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as typeof form.type })}
              >
                <SelectTrigger id="ba-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeKeys.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`types.${key}` as never)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ba-currency">{t("table.currency")}</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm({ ...form, currency: v })}
              >
                <SelectTrigger id="ba-currency">
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
              <Label htmlFor="ba-balance">{t("createDialog.balanceLabel")}</Label>
              <Input
                id="ba-balance"
                type="number"
                min={0}
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("bankImport.cancel")}
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
