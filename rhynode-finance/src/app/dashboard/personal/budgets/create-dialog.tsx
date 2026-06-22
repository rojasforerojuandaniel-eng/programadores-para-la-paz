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
import { Plus, Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { executeMutation } from "@/lib/offline-queue";

const periodLabelKeys: Record<string, string> = {
  WEEKLY: "createDialog.periods.WEEKLY",
  MONTHLY: "createDialog.periods.MONTHLY",
  YEARLY: "createDialog.periods.YEARLY",
};

export function CreateBudgetDialog({ trigger }: { trigger?: React.ReactNode } = {}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations("dashboard.budgets");
  const [form, setForm] = useState({
    name: "",
    amount: "",
    period: "MONTHLY",
    startDate: "",
    endDate: "",
    categoryId: "",
    rollover: false,
    alertThreshold: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.amount || !form.startDate) return;
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        amount: Number(form.amount),
        period: form.period,
        startDate: form.startDate,
        rollover: form.rollover,
      };
      if (form.endDate) body.endDate = form.endDate;
      if (form.categoryId) body.categoryId = form.categoryId;
      if (form.alertThreshold) body.alertThreshold = Number(form.alertThreshold);

      await executeMutation(
        "/api/personal/budgets",
        "POST",
        body,
        {
          onSuccess: () => {
            trackEvent("budget_created", {
              period: form.period,
              hasEndDate: Boolean(form.endDate),
              hasAlertThreshold: Boolean(form.alertThreshold),
            });
            setOpen(false);
            setForm({
              name: "",
              amount: "",
              period: "MONTHLY",
              startDate: "",
              endDate: "",
              categoryId: "",
              rollover: false,
              alertThreshold: "",
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
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {t("createDialog.trigger")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("createDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="bud-name">{t("createDialog.name")}</Label>
            <Input
              id="bud-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("createDialog.namePlaceholder")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bud-amount">{t("createDialog.amount")}</Label>
              <Input
                id="bud-amount"
                type="number"
                min={0}
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bud-period">{t("createDialog.period")}</Label>
              <Select
                value={form.period}
                onValueChange={(v) => setForm({ ...form, period: v })}
              >
                <SelectTrigger id="bud-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">{t(periodLabelKeys.WEEKLY as never)}</SelectItem>
                  <SelectItem value="MONTHLY">{t(periodLabelKeys.MONTHLY as never)}</SelectItem>
                  <SelectItem value="YEARLY">{t(periodLabelKeys.YEARLY as never)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bud-start">{t("createDialog.startDate")}</Label>
              <Input
                id="bud-start"
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bud-end">{t("createDialog.endDate")}</Label>
              <Input
                id="bud-end"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bud-alert">{t("createDialog.alertThreshold")}</Label>
              <Input
                id="bud-alert"
                type="number"
                min={0}
                value={form.alertThreshold}
                onChange={(e) => setForm({ ...form, alertThreshold: e.target.value })}
                placeholder={t("createDialog.alertPlaceholder")}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="bud-rollover"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={form.rollover}
                onChange={(e) => setForm({ ...form, rollover: e.target.checked })}
              />
              <Label htmlFor="bud-rollover">{t("createDialog.rollover")}</Label>
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

interface BudgetMember {
  id: string;
  name: string;
  email: string;
}

interface ShareBudgetDialogProps {
  budgetId: string;
  budgetName: string;
  members?: BudgetMember[];
}

export function ShareBudgetDialog({ budgetId, budgetName, members = [] }: ShareBudgetDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const t = useTranslations("dashboard.budgets");

  async function handleGenerateInvite() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const code = `RHY-${budgetId.slice(0, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      setInviteCode(code);
    } catch {
      toast.error(t("shareDialog.generateError"));
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(t("shareDialog.copiedToast"));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          {t("shareDialog.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("shareDialog.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">{budgetName}</p>
            <Label htmlFor="share-email">{t("shareDialog.collaboratorEmail")}</Label>
            <Input
              id="share-email"
              type="email"
              placeholder={t("shareDialog.emailPlaceholder")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setInviteCode(null);
              }}
            />
          </div>

          {inviteCode ? (
            <div className="rounded-lg border border-border bg-muted p-3">
              <p className="text-xs text-muted-foreground">{t("shareDialog.inviteCode")}</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-2 py-1 text-sm font-mono">
                  {inviteCode}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      {t("shareDialog.copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      {t("shareDialog.copy")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleGenerateInvite}
              disabled={loading || !email.trim()}
              className="w-full"
            >
              {loading ? t("shareDialog.generating") : t("shareDialog.generate")}
            </Button>
          )}

          {members.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("shareDialog.currentMembers")}</p>
              <div className="flex flex-wrap gap-2">
                {members.map((member) => {
                  const initials = member.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5"
                      title={member.email}
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {initials}
                      </div>
                      <span className="text-sm">{member.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
