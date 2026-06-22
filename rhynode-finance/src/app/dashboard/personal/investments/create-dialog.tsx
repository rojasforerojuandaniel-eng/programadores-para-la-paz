"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus } from "lucide-react";

const investmentTypes = [
  { value: "STOCK" },
  { value: "BOND" },
  { value: "CRYPTO" },
  { value: "ETF" },
  { value: "REAL_ESTATE" },
  { value: "OTHER" },
];

export function CreateInvestmentDialog({ trigger }: { trigger?: React.ReactNode } = {}) {
  const t = useTranslations("dashboard.investments");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [investmentType, setInvestmentType] = useState("STOCK");
  const [balance, setBalance] = useState("");
  const [investedAmount, setInvestedAmount] = useState("");
  const [currency, setCurrency] = useState("COP");
  const [provider, setProvider] = useState("");
  const [externalId, setExternalId] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/personal/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          investmentType,
          balance: Number(balance),
          investedAmount: investedAmount ? Number(investedAmount) : Number(balance),
          currency,
          provider: provider || undefined,
          externalId: externalId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("createDialog.toast.error"));
      }

      setOpen(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createDialog.toast.unknownError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t("createDialog.triggerButton")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-lg max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{t("createDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("createDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("createDialog.fields.name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("createDialog.placeholders.name")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">{t("createDialog.fields.type")}</Label>
            <Select value={investmentType} onValueChange={setInvestmentType}>
              <SelectTrigger id="type">
                <SelectValue placeholder={t("createDialog.placeholders.type")} />
              </SelectTrigger>
              <SelectContent>
                {investmentTypes.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {t(`types.${item.value}` as never)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="balance">{t("createDialog.fields.balance")}</Label>
              <Input
                id="balance"
                type="number"
                min={0}
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invested">{t("createDialog.fields.invested")}</Label>
              <Input
                id="invested"
                type="number"
                min={0}
                step="0.01"
                value={investedAmount}
                onChange={(e) => setInvestedAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">{t("createDialog.fields.currency")}</Label>
            <Input
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="COP"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider">{t("createDialog.fields.provider")}</Label>
            <Input
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder={t("createDialog.placeholders.provider")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="externalId">{t("createDialog.fields.externalId")}</Label>
            <Input
              id="externalId"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder={t("createDialog.placeholders.externalId")}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("createDialog.submitting") : t("createDialog.title")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}