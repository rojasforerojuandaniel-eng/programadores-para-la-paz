"use client";

import { useState } from "react";
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

export function CreateTaxReportDialog({ onCreate }: { onCreate: () => void }) {
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
        toast.error("Error al crear reporte fiscal");
      }
    } catch {
      toast.error("Error de red");
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
          Nuevo Reporte
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">Nuevo Reporte Fiscal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tax-authority">Autoridad</Label>
              <Select
                value={form.authority}
                onValueChange={(v) => setForm({ ...form, authority: v as typeof form.authority })}
              >
                <SelectTrigger id="tax-authority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIAN">DIAN (Colombia)</SelectItem>
                  <SelectItem value="SAT">SAT (México)</SelectItem>
                  <SelectItem value="AFIP">AFIP (Argentina)</SelectItem>
                  <SelectItem value="SII">SII (Chile)</SelectItem>
                  <SelectItem value="SUNAT">SUNAT (Perú)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax-type">Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as typeof form.type })}
              >
                <SelectTrigger id="tax-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IVA">IVA / VAT</SelectItem>
                  <SelectItem value="ISR">ISR</SelectItem>
                  <SelectItem value="RETENTION">Retención</SelectItem>
                  <SelectItem value="ICA">ICA</SelectItem>
                  <SelectItem value="RENTA">Renta</SelectItem>
                  <SelectItem value="DIAN_ELECTRONIC">Factura Electrónica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tax-period">Período</Label>
              <Select
                value={form.period}
                onValueChange={(v) => setForm({ ...form, period: v as typeof form.period })}
              >
                <SelectTrigger id="tax-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Mensual</SelectItem>
                  <SelectItem value="BIMONTHLY">Bimestral</SelectItem>
                  <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                  <SelectItem value="ANNUAL">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax-year">Año</Label>
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
                <Label htmlFor="tax-month">Mes</Label>
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
                <Label htmlFor="tax-quarter">Trimestre</Label>
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
              <Label htmlFor="tax-due">Fecha de vencimiento</Label>
              <Input
                id="tax-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax-amount">Monto</Label>
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
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
