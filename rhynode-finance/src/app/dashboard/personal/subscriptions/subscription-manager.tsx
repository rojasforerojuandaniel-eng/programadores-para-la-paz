"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SubscriptionStatusActions,
  SubscriptionStatus,
} from "./subscription-status-actions";
import {
  CreditCard,
  Activity,
  ArrowUp,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Clock,
  RefreshCw,
} from "lucide-react";

export type SubscriptionView = {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  frequency: "MONTHLY" | "QUARTERLY" | "YEARLY";
  provider: string | null;
  category: string | null;
  status: SubscriptionStatus;
  canceledAt: Date | null;
  cancellationUrl: string | null;
  lastDetectedAt: Date;
  lastPaidAt: Date | null;
  createdAt: Date;
  nextChargeDate: Date | null;
  increased: boolean;
  unused: boolean;
};

interface SubscriptionManagerProps {
  subscriptions: SubscriptionView[];
  kpis: {
    monthlySpend: number;
    annualSpend: number;
    activeCount: number;
    nextRenewal: Date | null;
    totalCount: number;
  };
  currency: string;
  initialFilter: string;
}

const filters: { value: string; label: string }[] = [
  { value: "ACTIVE", label: "Activas" },
  { value: "PENDING_CANCELLATION", label: "Para cancelar" },
  { value: "CANCELED", label: "Canceladas" },
  { value: "ALL", label: "Todas" },
];

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function frequencyLabel(frequency: string) {
  switch (frequency) {
    case "MONTHLY":
      return "Mensual";
    case "QUARTERLY":
      return "Trimestral";
    case "YEARLY":
      return "Anual";
    default:
      return frequency;
  }
}

function monthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case "MONTHLY":
      return amount;
    case "QUARTERLY":
      return amount / 3;
    case "YEARLY":
      return amount / 12;
    default:
      return amount;
  }
}

function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  return Math.ceil(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const config: Record<
    SubscriptionStatus,
    { variant: "default" | "secondary" | "outline" | "destructive"; label: string }
  > = {
    ACTIVE: { variant: "default", label: "Activa" },
    PENDING_CANCELLATION: { variant: "outline", label: "Por cancelar" },
    CANCELED: { variant: "secondary", label: "Cancelada" },
  };
  const { variant, label } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function SubscriptionManager({
  subscriptions,
  kpis,
  currency,
  initialFilter,
}: SubscriptionManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState(initialFilter);

  function handleFilterChange(value: string) {
    setFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") {
      params.delete("filter");
    } else {
      params.set("filter", value);
    }
    router.push(`/dashboard/personal/subscriptions?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">Suscripciones</h1>
          <p className="body-default mt-1">
            Detecta, monitorea y cancela suscripciones para ahorrar
          </p>
        </div>
        <form action="/api/personal/subscriptions/detect" method="POST">
          <Button type="submit" className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Detectar
          </Button>
        </form>
      </div>

      <Tabs
        value={filter}
        onValueChange={handleFilterChange}
        className="w-full"
      >
        <TabsList
          className="w-full sm:w-auto"
          aria-label="Filtrar suscripciones por estado"
        >
          {filters.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Gasto mensual"
          value={formatCurrency(kpis.monthlySpend, currency)}
          icon={Wallet}
        />
        <KpiCard
          label="Gasto anual estimado"
          value={formatCurrency(kpis.annualSpend, currency)}
          icon={TrendingUp}
        />
        <KpiCard
          label="Suscripciones activas"
          value={kpis.activeCount}
          icon={Activity}
        />
        <KpiCard
          label="Próxima renovación"
          value={
            kpis.nextRenewal ? (
              new Date(kpis.nextRenewal).toLocaleDateString("es-CO")
            ) : (
              "—"
            )
          }
          icon={Clock}
          footer={
            kpis.nextRenewal ? `${daysUntil(kpis.nextRenewal)} días` : undefined
          }
        />
      </div>

      <div aria-live="polite" aria-atomic="false">
        {subscriptions.length === 0 ? (
          <EmptyStateCard
            icon={CreditCard}
            title="No hay suscripciones"
            description="No encontramos suscripciones en este filtro."
            hint="Prueba otro filtro o presiona detectar para buscar nuevas."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead scope="col">Suscripción</TableHead>
                    <TableHead scope="col">Monto</TableHead>
                    <TableHead scope="col">Frecuencia</TableHead>
                    <TableHead scope="col">Próximo cargo</TableHead>
                    <TableHead scope="col">Estado</TableHead>
                    <TableHead scope="col" className="text-right">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{sub.name}</span>
                          <div className="flex flex-wrap gap-1">
                            {sub.unused && (
                              <Badge
                                variant="outline"
                                className="gap-1 border-amber-700/30 text-amber-700"
                              >
                                <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Sin usar
                              </Badge>
                            )}
                            {sub.increased && (
                              <Badge
                                variant="outline"
                                className="gap-1 border-rose-700/30 text-rose-700"
                              >
                                <ArrowUp className="h-3 w-3" aria-hidden="true" /> Subió
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {formatCurrency(sub.amount, sub.currency)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(
                              monthlyEquivalent(sub.amount, sub.frequency),
                              sub.currency
                            )}{" "}
                            / mes
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {frequencyLabel(sub.frequency)}
                      </TableCell>
                      <TableCell className="py-3">
                        {sub.nextChargeDate ? (
                          <div className="flex flex-col">
                            <span>
                              {new Date(sub.nextChargeDate).toLocaleDateString(
                                "es-CO"
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {daysUntil(sub.nextChargeDate)} días
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <StatusBadge status={sub.status} />
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <SubscriptionStatusActions
                          id={sub.id}
                          status={sub.status}
                          cancellationUrl={sub.cancellationUrl}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul
              className="grid grid-cols-1 gap-4 md:hidden"
              role="list"
              aria-label="Lista de suscripciones"
            >
              {subscriptions.map((sub) => (
                <li key={sub.id}>
                  <Card className="surface-elevated-2 rounded-xl border-border">
                    <CardContent className="flex flex-col gap-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{sub.name}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {sub.unused && (
                              <Badge
                                variant="outline"
                                className="gap-1 border-amber-700/30 text-amber-700"
                              >
                                <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Sin usar
                              </Badge>
                            )}
                            {sub.increased && (
                              <Badge
                                variant="outline"
                                className="gap-1 border-rose-700/30 text-rose-700"
                              >
                                <ArrowUp className="h-3 w-3" aria-hidden="true" /> Subió
                              </Badge>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={sub.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="text-muted-foreground">Monto</div>
                        <div className="text-right font-medium">
                          {formatCurrency(sub.amount, sub.currency)}
                        </div>
                        <div className="text-muted-foreground">Mensual</div>
                        <div className="text-right">
                          {formatCurrency(
                            monthlyEquivalent(sub.amount, sub.frequency),
                            sub.currency
                          )}
                        </div>
                        <div className="text-muted-foreground">Frecuencia</div>
                        <div className="text-right">
                          {frequencyLabel(sub.frequency)}
                        </div>
                        <div className="text-muted-foreground">Próximo cargo</div>
                        <div className="text-right">
                          {sub.nextChargeDate
                            ? new Date(
                                sub.nextChargeDate
                              ).toLocaleDateString("es-CO")
                            : "—"}
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <SubscriptionStatusActions
                          id={sub.id}
                          status={sub.status}
                          cancellationUrl={sub.cancellationUrl}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
