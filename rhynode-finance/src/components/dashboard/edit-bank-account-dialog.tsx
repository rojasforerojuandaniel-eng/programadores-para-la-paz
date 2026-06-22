"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
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
import { updateBankAccount } from "@/app/dashboard/accounts/actions";
import type { BankAccountRow } from "./bank-account-actions";

const typeKeys = ["CHECKING", "SAVINGS", "CREDIT", "VIRTUAL"] as const;

interface EditBankAccountDialogProps {
  account: BankAccountRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBankAccountDialog({
  account,
  open,
  onOpenChange,
}: EditBankAccountDialogProps) {
  const t = useTranslations("dashboard.accounts");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: account.name,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    type: account.type,
    currency: account.currency,
    balance: account.balance.toString(),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.bankName.trim()) return;

    setLoading(true);
    const result = await updateBankAccount(account.id, {
      name: form.name.trim(),
      bankName: form.bankName.trim(),
      accountNumber: form.accountNumber.trim(),
      type: form.type,
      currency: form.currency,
      balance: Number(form.balance) || 0,
    });
    setLoading(false);

    if (result.success) {
      toast.success(t("editDialog.toastSuccess"));
      onOpenChange(false);
    } else {
      toast.error(result.error || t("editDialog.toastError"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("editDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-ba-name">{t("createDialog.nameLabel")}</Label>
            <Input
              id="edit-ba-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("createDialog.namePlaceholder")}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-ba-bank">{t("createDialog.bankLabel")}</Label>
              <Input
                id="edit-ba-bank"
                required
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                placeholder={t("createDialog.bankPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ba-number">{t("createDialog.numberLabel")}</Label>
              <Input
                id="edit-ba-number"
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                placeholder="****1234"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="edit-ba-type">{t("table.type")}</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    type: v as "CHECKING" | "SAVINGS" | "CREDIT" | "VIRTUAL",
                  })
                }
              >
                <SelectTrigger id="edit-ba-type">
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
              <Label htmlFor="edit-ba-currency">{t("table.currency")}</Label>
              <Select
                value={form.currency}
                onValueChange={(v) =>
                  setForm({ ...form, currency: v as "COP" | "MXN" | "BRL" | "USD" })
                }
              >
                <SelectTrigger id="edit-ba-currency">
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
              <Label htmlFor="edit-ba-balance">{t("table.balance")}</Label>
              <Input
                id="edit-ba-balance"
                type="number"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                placeholder="0"
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
              {t("bankImport.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("createDialog.saving") : t("editDialog.saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
