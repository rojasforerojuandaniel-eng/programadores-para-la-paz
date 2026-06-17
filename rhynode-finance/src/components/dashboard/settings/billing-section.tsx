"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertCircle,
  Check,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface Plan {
  name: string;
  invoicesUsed: number;
  invoicesLimit: number;
  usersUsed: number;
  usersLimit: number;
}

interface PaymentItem {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface BillingSectionProps {
  plan: Plan;
  usagePercent: number;
  upgrading: boolean;
  saving: boolean;
  payments?: PaymentItem[];
  paymentsLoading?: boolean;
  onUpgrade: (targetPlan: "GROWTH" | "SCALE") => void;
}

const PLAN_DETAILS: Record<
  string,
  {
    price: string;
    period: string;
    description: string;
    features: string[];
    unavailable?: string[];
  }
> = {
  Starter: {
    price: "$0",
    period: "/mes",
    description: "Perfecto para comenzar a organizar tus finanzas.",
    features: [
      "10 facturas/mes",
      "1 usuario",
      "Clientes ilimitados",
      "Soporte por email",
      "App móvil PWA",
    ],
    unavailable: ["Facturación DIAN avanzada", "API access", "Soporte prioritario"],
  },
  Growth: {
    price: "$29.900",
    period: "/mes",
    description: "Para freelancers y pymes que facturan regularmente.",
    features: [
      "100 facturas/mes",
      "3 usuarios",
      "Clientes ilimitados",
      "Compliance DIAN/SAT",
      "Reportes avanzados",
      "Soporte prioritario",
    ],
    unavailable: ["API access", "Onboarding dedicado"],
  },
  Scale: {
    price: "$79.900",
    period: "/mes",
    description: "Potencia total para equipos en crecimiento.",
    features: [
      "Facturas ilimitadas",
      "Usuarios ilimitados",
      "Clientes ilimitados",
      "API access",
      "Soporte prioritario",
      "Onboarding dedicado",
      "Account manager",
    ],
  },
};

const PLAN_ORDER = ["Starter", "Growth", "Scale"] as const;

type PlanName = (typeof PLAN_ORDER)[number];

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusBadge(status: string) {
  switch (status.toUpperCase()) {
    case "PAID":
    case "SUCCEEDED":
      return (
        <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
          Exitoso
        </Badge>
      );
    case "PENDING":
      return (
        <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-600">
          Pendiente
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-rose-600">
          Fallido
        </Badge>
      );
    case "REFUNDED":
      return (
        <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-600">
          Reembolsado
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function BillingSection({
  plan,
  usagePercent,
  upgrading,
  saving,
  payments = [],
  paymentsLoading = false,
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
        trackEvent("subscription_cancel_marked");
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

  const currentPlanName = plan.name || "Starter";
  const currentIndex = PLAN_ORDER.indexOf(currentPlanName as PlanName);
  const isLimitlessInvoices = plan.invoicesLimit === Infinity || plan.invoicesLimit >= 999999;
  const isLimitlessUsers = plan.usersLimit === Infinity || plan.usersLimit >= 999999;

  return (
    <div className="space-y-5">
      <Card className="surface-elevated-2">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="heading-card flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
            Plan y Uso
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {currentPlanName}
            </Badge>
            <Button type="submit" disabled={saving} size="sm" className="hidden sm:inline-flex">
              Guardar Cambios
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <KpiCard label="Plan" value={currentPlanName} icon={TrendingUp} />
            <KpiCard
              label="Facturas"
              value={
                isLimitlessInvoices
                  ? `${plan.invoicesUsed.toLocaleString("es-CO")} / ∞`
                  : `${plan.invoicesUsed.toLocaleString("es-CO")} / ${plan.invoicesLimit.toLocaleString("es-CO")}`
              }
              icon={Receipt}
            />
            <KpiCard
              label="Usuarios"
              value={
                isLimitlessUsers
                  ? `${plan.usersUsed.toLocaleString("es-CO")} / ∞`
                  : `${plan.usersUsed.toLocaleString("es-CO")} / ${plan.usersLimit.toLocaleString("es-CO")}`
              }
              icon={Users}
            />
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

          <div className="space-y-1">
            <ProgressBar
              value={isLimitlessInvoices ? 0 : plan.invoicesUsed}
              max={isLimitlessInvoices ? 100 : plan.invoicesLimit}
              colorClassName={
                usagePercent >= 90
                  ? "bg-danger"
                  : usagePercent >= 70
                    ? "bg-warning"
                    : "bg-primary"
              }
              label={isLimitlessInvoices ? "Uso ilimitado" : `${usagePercent}% utilizado`}
            />
            <p className="text-xs text-muted-foreground">
              {isLimitlessInvoices
                ? "Plan con facturas ilimitadas"
                : `${usagePercent}% de tu límite de facturas utilizado`}
            </p>
          </div>

          {usagePercent >= 80 && currentPlanName !== "Scale" && (
            <div className="flex items-start gap-3 rounded-lg bg-warning/10 p-3 text-sm text-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <div>
                <p className="font-medium">Estás cerca de tu límite</p>
                <p className="text-muted-foreground">
                  Actualiza tu plan para seguir facturando sin interrupciones.
                </p>
              </div>
            </div>
          )}

          <Button type="submit" disabled={saving} className="w-full sm:hidden">
            Guardar Cambios
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="heading-card">Comparativa de planes</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLAN_ORDER.map((planName, index) => {
            const details = PLAN_DETAILS[planName];
            const isCurrent = currentPlanName === planName;
            const isUpgrade = index > currentIndex;
            const isDowngrade = index < currentIndex;

            return (
              <Card
                key={planName}
                className={cn(
                  "surface-elevated-1 flex flex-col",
                  isCurrent && "border-primary/30 ring-1 ring-primary/20"
                )}
              >
                <CardContent className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{planName}</span>
                        {isCurrent && <Badge>Actual</Badge>}
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-foreground">{details.price}</span>
                        <span className="text-sm text-muted-foreground">{details.period}</span>
                      </div>
                    </div>
                    {isUpgrade && <ArrowUpRight className="h-5 w-5 text-success" aria-hidden="true" />}
                    {isDowngrade && <ArrowDownRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
                  </div>

                  <p className="text-sm text-muted-foreground">{details.description}</p>

                  <ul className="my-4 flex-1 space-y-2">
                    {details.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                    {details.unavailable?.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Minus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Plan actual
                    </Button>
                  ) : isDowngrade ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      aria-label="Gestionar cambio de plan"
                      onClick={() => {
                        trackEvent("plan_downgrade_clicked", { targetPlan: planName.toUpperCase() });
                        openBillingPortal();
                      }}
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      Gestionar cambio
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="w-full"
                      aria-label={upgrading ? "Procesando selección de plan" : `Elegir plan ${planName}`}
                      onClick={() => {
                        trackEvent("plan_upgrade_clicked", { targetPlan: planName.toUpperCase() });
                        onUpgrade(planName.toUpperCase() as "GROWTH" | "SCALE");
                      }}
                      disabled={upgrading}
                    >
                      {upgrading ? "Procesando..." : `Elegir ${planName}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" aria-hidden="true" />
            Historial de Pagos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentsLoading ? (
            <div className="space-y-2">
              <div className="h-10 animate-pulse rounded bg-muted" />
              <div className="h-10 animate-pulse rounded bg-muted" />
              <div className="h-10 animate-pulse rounded bg-muted" />
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
              <Clock className="mb-2 h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">Sin pagos registrados</p>
              <p className="text-sm text-muted-foreground">
                Los pagos de tus facturas y suscripciones aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th scope="col" className="py-2 pr-4 font-medium">Fecha</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Método</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Estado</th>
                    <th scope="col" className="py-2 text-right font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 whitespace-nowrap text-foreground">
                        {formatDate(payment.paidAt ?? payment.createdAt)}
                      </td>
                      <td className="py-3 pr-4 text-foreground">{payment.method}</td>
                      <td className="py-3 pr-4">{statusBadge(payment.status)}</td>
                      <td className="py-3 text-right font-medium text-foreground">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
            Facturación y Suscripción
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="body-default">
            Gestiona tu suscripción, métodos de pago e historial de facturación desde el portal seguro de Stripe.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              aria-label="Abrir portal de facturación de Stripe"
              onClick={openBillingPortal}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Portal de Facturación
            </Button>
            {currentPlanName !== "Starter" && (
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground hover:text-danger"
                aria-label="Cancelar suscripción actual"
                onClick={cancelSubscription}
              >
                Cancelar Suscripción
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
            Métodos de Pago (Cobros)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="body-default">
            Conecta proveedores de pago locales para cobrar a tus clientes.
          </p>
          <ul role="list" aria-label="Proveedores de pago disponibles" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {providers.map((p) => (
              <li key={p.name} className="surface-elevated-1 rounded-lg p-4">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-muted-foreground">{p.desc}</div>
                <Button variant="outline" size="sm" className="mt-3 w-full" disabled>
                  {p.status}
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
