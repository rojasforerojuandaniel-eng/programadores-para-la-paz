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

const authorityKeys: Record<string, string> = {
  DIAN: "createReportDialog.authorities.DIAN",
  SAT: "createReportDialog.authorities.SAT",
  AFIP: "createReportDialog.authorities.AFIP",
  SII: "createReportDialog.authorities.SII",
  SUNAT: "createReportDialog.authorities.SUNAT",
};

const typeKeys: Record<string, string> = {
  IVA: "types.IVA",
  ISR: "types.ISR",
  RETENTION: "types.RETENTION",
  ICA: "types.ICA",
  RENTA: "types.RENTA",
  DIAN_ELECTRONIC: "types.DIAN_ELECTRONIC",
};

export function CreateTaxReportDialog({ onCreate }: { onCreate: () => void }) {
  const t = useTranslations("dashboard.tax");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    period: "MONTHLY" as "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "ANNUAL",
    year: new Date().getFullYear().toString(),
    month: "",
    quarter: "",
    authority: "DIAN" as "DIAN" | "SAT" | "AFIP" | "SII" | "SUNAT",
    type: "IVA" as "IVA" | "ISR" | "RETENTION" | "ICA" | "RENTA" | "DIAN_ELECTRONIC",
    dueDate: "",
    amount: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        period: form.period,
        year: Number(form.year),
        authority: form.authority,
        type: form.type,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        amount: form.amount ? Number(form.amount) : null,
      };
      if (form.period === "MONTHLY" && form.month) body.month = Number(form.month);
      if (form.period === "QUARTERLY" && form.quarter) body.quarter = Number(form.quarter);

      const res = await fetch("/api/tax-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setOpen(false);
        setForm({
          period: "MONTHLY",
          year: new Date().getFullYear().toString(),
          month: "",
          quarter: "",
          authority: "DIAN",
          type: "IVA",
          dueDate: "",
          amount: "",
        });
        onCreate();
      } else {
        toast.error(t("createReportDialog.toast.createError"));
      }
    } catch {
      toast.error(t("createReportDialog.toast.networkError"));
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
          {t("createReportDialog.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">{t("createReportDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tax-authority">{t("createReportDialog.authority")}</Label>
              <Select
                value={form.authority}
                onValueChange={(v) => setForm({ ...form, authority: v as typeof form.authority })}
              >
                <SelectTrigger id="tax-authority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIAN">{t(authorityKeys.DIAN as never)}</SelectItem>
                  <SelectItem value="SAT">{t(authorityKeys.SAT as never)}</SelectItem>
                  <SelectItem value="AFIP">{t(authorityKeys.AFIP as never)}</SelectItem>
                  <SelectItem value="SII">{t(authorityKeys.SII as never)}</SelectItem>
                  <SelectItem value="SUNAT">{t(authorityKeys.SUNAT as never)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax-type">{t("createReportDialog.type")}</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as typeof form.type })}
              >
                <SelectTrigger id="tax-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IVA">{t(typeKeys.IVA as never)}</SelectItem>
                  <SelectItem value="ISR">{t(typeKeys.ISR as never)}</SelectItem>
                  <SelectItem value="RETENTION">{t(typeKeys.RETENTION as never)}</SelectItem>
                  <SelectItem value="ICA">{t(typeKeys.ICA as never)}</SelectItem>
                  <SelectItem value="RENTA">{t(typeKeys.RENTA as never)}</SelectItem>
                  <SelectItem value="DIAN_ELECTRONIC">{t(typeKeys.DIAN_ELECTRONIC as never)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tax-period">{t("createReportDialog.period")}</Label>
              <Select
                value={form.period}
                onValueChange={(v) => setForm({ ...form, period: v as typeof form.period })}
              >
                <SelectTrigger id="tax-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">{t("monthly")}</SelectItem>
                  <SelectItem value="BIMONTHLY">{t("bimonthly")}</SelectItem>
                  <SelectItem value="QUARTERLY">{t("createReportDialog.quarterly")}</SelectItem>
                  <SelectItem value="ANNUAL">{t("createReportDialog.annual")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax-year">{t("year")}</Label>
              <Input
                id="tax-year"
                type="number"
                required
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
              />
            </div>
            {form.period === "MONTHLY" && (
              <div className="space-y-2">
                <Label htmlFor="tax-month">{t("month")}</Label>
                <Input
                  id="tax-month"
                  type="number"
                  min={1}
                  max={12}
                  value={form.month}
                  onChange={(e) => setForm({ ...form, month: e.target.value })}
                />
              </div>
            )}
            {form.period === "QUARTERLY" && (
              <div className="space-y-2">
                <Label htmlFor="tax-quarter">{t("createReportDialog.quarter")}</Label>
                <Input
                  id="tax-quarter"
                  type="number"
                  min={1}
                  max={4}
                  value={form.quarter}
                  onChange={(e) => setForm({ ...form, quarter: e.target.value })}
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tax-due">{t("createReportDialog.dueDate")}</Label>
              <Input
                id="tax-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax-amount">{t("createReportDialog.amount")}</Label>
              <Input
                id="tax-amount"
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("createReportDialog.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("createReportDialog.saving") : t("createReportDialog.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}