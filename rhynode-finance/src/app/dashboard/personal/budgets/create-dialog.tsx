"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export function CreateBudgetDialog({ trigger }: { trigger?: React.ReactNode } = {}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
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

      const res = await fetch("/api/personal/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
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
        toast.success("Presupuesto creado");
      } else {
        toast.error("Error al crear presupuesto");
      }
    } catch {
      toast.error("Error de red");
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
            Nuevo Presupuesto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="heading-card">Nuevo Presupuesto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="bud-name">Nombre *</Label>
            <Input
              id="bud-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej. Presupuesto mensual"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bud-amount">Monto *</Label>
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
              <Label>Periodo</Label>
              <Select
                value={form.period}
                onValueChange={(v) => setForm({ ...form, period: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Semanal</SelectItem>
                  <SelectItem value="MONTHLY">Mensual</SelectItem>
                  <SelectItem value="YEARLY">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bud-start">Fecha inicio *</Label>
              <Input
                id="bud-start"
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bud-end">Fecha fin</Label>
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
              <Label htmlFor="bud-alert">Umbral de alerta</Label>
              <Input
                id="bud-alert"
                type="number"
                min={0}
                value={form.alertThreshold}
                onChange={(e) => setForm({ ...form, alertThreshold: e.target.value })}
                placeholder="Ej. 80"
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
              <Label htmlFor="bud-rollover">Acumular saldo</Label>
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

  async function handleGenerateInvite() {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const code = `RHY-${budgetId.slice(0, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      setInviteCode(code);
    } catch {
      toast.error("Error al generar invitacion");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Codigo copiado");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Compartir
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-card">Compartir Presupuesto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">{budgetName}</p>
            <Label htmlFor="share-email">Correo del colaborador</Label>
            <Input
              id="share-email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setInviteCode(null);
              }}
            />
          </div>

          {inviteCode ? (
            <div className="rounded-lg border border-border bg-muted p-3">
              <p className="text-xs text-muted-foreground">Codigo de invitacion</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-2 py-1 text-sm font-mono">
                  {inviteCode}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar
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
              {loading ? "Generando..." : "Generar invitacion"}
            </Button>
          )}

          {members.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Miembros actuales</p>
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
