
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import {
  CreditCard,
  ExternalLink,
  Zap,
  Receipt,
  Users,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface Plan {
  name: string;
  invoicesUsed: number;
  invoicesLimit: number;
  usersUsed: number;
  usersLimit: number;
}

interface BillingSectionProps {
  plan: Plan;
  usagePercent: number;
  upgrading: boolean;
  saving: boolean;
  onUpgrade: (targetPlan: "GROWTH" | "SCALE") => void;
}

export function BillingSection({
  plan,
  usagePercent,
  upgrading,
  saving,
  onUpgrade,
}: BillingSectionProps) {
  async function openBillingPortal() {
    try {
      const res = await fetch("/api/subscribe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error("Error al abrir portal");
    } catch {
      toast.error("Error al abrir portal");
    }
  }

  async function cancelSubscription() {
    if (!confirm("¿Seguro que quieres cancelar tu suscripción?")) return;
    try {
      const res = await fetch("/api/subscribe/cancel", { method: "POST" });
      if (res.ok) {
        toast.success("Suscripción cancelada");
        window.location.reload();
      } else {
        toast.error("Error al cancelar");
      }
    } catch {
      toast.error("Error al cancelar");
    }
  }

  const providers = [
    {
      name: "Wompi",
      desc: "Colombia — Tarjetas, PSE, Bancolombia",
      status: "Próximamente",
    },
    {
      name: "PayU",
      desc: "Multi-país — Tarjetas, efectivo",
      status: "Próximamente",
    },
    {
      name: "PSE",
      desc: "Colombia — Transferencia bancaria",
      status: "Próximamente",
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="surface-elevated-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="heading-card flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Plan y Uso
          </CardTitle>
          <Button type="submit" disabled={saving} size="sm" className="hidden sm:inline-flex">
            Guardar Cambios
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <KpiCard label="Plan" value={plan.name} icon={TrendingUp} />
            <KpiCard
              label="Facturas"
              value={`${plan.invoicesUsed} / ${plan.invoicesLimit}`}
              icon={Receipt}
            />
            <KpiCard label="Usuarios" value={`${plan.usersUsed} / ${plan.usersLimit}`} icon={Users} />
            <KpiCard
              label="Uso"
              value={`${usagePercent}%`}
              icon={CheckCircle}
              valueClassName={
                usagePercent >= 90
                  ? "text-danger"
                  : usagePercent >= 70
                    ? "text-warning"
                    : "text-success"
              }
            />
          </div>

          <ProgressBar value={plan.invoicesUsed} max={plan.invoicesLimit} colorClassName="bg-primary" />
          <p className="text-xs text-muted-foreground">
            {usagePercent}% de tu límite de facturas utilizado
          </p>

          {plan.name === "Starter" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Card className="surface-elevated-1 border-primary/20">
                <CardContent className="space-y-3 p-4">
                  <div className="font-medium">Growth — $29.900/mes</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>100 facturas/mes</li>
                    <li>3 usuarios</li>
                    <li>Clientes ilimitados</li>
                    <li>Compliance DIAN/SAT</li>
                  </ul>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={() => onUpgrade("GROWTH")}
                    disabled={upgrading}
                  >
                    {upgrading ? "Procesando..." : "Elegir Growth"}
                  </Button>
                </CardContent>
              </Card>
              <Card className="surface-elevated-1">
                <CardContent className="space-y-3 p-4">
                  <div className="font-medium">Scale — $79.900/mes</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Facturas ilimitadas</li>
                    <li>Usuarios ilimitados</li>
                    <li>API access</li>
                    <li>Soporte prioritario</li>
                  </ul>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => onUpgrade("SCALE")}
                    disabled={upgrading}
                  >
                    {upgrading ? "Procesando..." : "Elegir Scale"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
          <Button type="submit" disabled={saving} className="w-full sm:hidden">
            Guardar Cambios
          </Button>
        </CardContent>
      </Card>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Facturación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={openBillingPortal}
            >
              <ExternalLink className="h-4 w-4" />
              Portal de Facturación
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-danger"
              onClick={cancelSubscription}
            >
              Cancelar Suscripción
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Métodos de Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="body-default">
            Conecta proveedores de pago locales para cobrar a tus clientes.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {providers.map((p) => (
              <div key={p.name} className="surface-elevated-1 rounded-lg p-4">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-muted-foreground">{p.desc}</div>
                <Button variant="outline" size="sm" className="mt-3 w-full" disabled>
                  {p.status}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
