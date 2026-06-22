"use client";

import { useState } from "react";
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

interface AddSavingsDialogProps {
  goalId: string;
  goalName: string;
  currency: string;
}

export function AddSavingsDialog({
  goalId,
  goalName,
  currency,
}: AddSavingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const router = useRouter();
  const t = useTranslations("dashboard.goals");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!amount || value <= 0) {
      toast.error(t("addSavings.invalidAmount"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/personal/goals/${goalId}/savings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value }),
      });

      if (res.ok) {
        toast.success(t("addSavings.added"));
        setAmount("");
        setOpen(false);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t("addSavings.addError"));
      }
    } catch {
      toast.error(t("addSavings.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("addSavings.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-card">
            {t("addSavings.title", { goalName })}
          </DialogTitle>
          <DialogDescription>
            {t("addSavings.description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="savings-amount">
              {t("addSavings.amountLabel", { currency })}
            </Label>
            <Input
              id="savings-amount"
              type="number"
              min={0.01}
              step={0.01}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {t("addSavings.hint")}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t("addSavings.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("addSavings.saving") : t("addSavings.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
