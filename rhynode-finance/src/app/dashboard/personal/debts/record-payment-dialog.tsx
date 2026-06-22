"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
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
import { Coins } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/lib/locale";

interface RecordPaymentDialogProps {
  debtId: string;
  debtName: string;
  remaining: number;
  currency: string;
  trigger?: React.ReactNode;
}

export function RecordPaymentDialog({
  debtId,
  debtName,
  remaining,
  currency,
  trigger,
}: RecordPaymentDialogProps) {
  const t = useTranslations("dashboard.debts");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payment = Number(amount);
    if (!Number.isFinite(payment) || payment <= 0) {
      toast.error(t("recordPaymentDialog.toast.invalidAmount"));
      return;
    }
    if (payment > remaining) {
      toast.error(t("recordPaymentDialog.toast.exceedsRemaining", { amount: formatCurrency(remaining, currency, locale) }));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/personal/debts/${debtId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: payment }),
      });

      if (res.ok) {
        toast.success(t("recordPaymentDialog.toast.registered"));
        router.refresh();
        setOpen(false);
        setAmount("");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t("recordPaymentDialog.toast.error"));
      }
    } catch {
      toast.error(t("recordPaymentDialog.toast.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Coins className="h-4 w-4" aria-hidden="true" />
            {t("recordPayment")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("recordPayment")}</DialogTitle>
          <DialogDescription>
            {debtName} · {t("recordPaymentDialog.remainingLabel")}{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(remaining, currency, locale)}
            </span>
            <span className="block pt-1 text-xs text-muted-foreground">
              {t("recordPaymentDialog.transactionNote")}
            </span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor={`payment-amount-${debtId}`}>{t("recordPaymentDialog.fields.amount")}</Label>
            <Input
              id={`payment-amount-${debtId}`}
              type="number"
              min={0.01}
              step={0.01}
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={formatCurrency(Math.min(remaining, 100000), currency, locale)}
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {t("recordPaymentDialog.maxPrefix")} {formatCurrency(remaining, currency, locale)}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t("recordPaymentDialog.cancel")}
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? t("recordPaymentDialog.submitting") : t("recordPayment")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}