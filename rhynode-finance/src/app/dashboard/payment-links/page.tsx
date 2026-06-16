"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreatePaymentLinkDialog } from "@/components/dashboard/create-payment-link-dialog";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { DataTable } from "@/components/dashboard/data-table";
import { TableCell } from "@/components/ui/table";
import { Loader2, CreditCard, Link2, CheckCircle2, AlertCircle, DollarSign } from "lucide-react";

interface PaymentLink {
  id: string;
  name: string;
  amount: number;
  currency: string;
  status: string;
  currentPayments: number;
  maxPayments?: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Activo", className: "bg-emerald-500/10 text-emerald-400" },
  INACTIVE: { label: "Inactivo", className: "bg-gray-500/10 text-gray-400" },
  EXPIRED: { label: "Expirado", className: "bg-amber-500/10 text-amber-400" },
  EXHAUSTED: { label: "Agotado", className: "bg-red-500/10 text-red-400" },
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PaymentLinksPage() {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/payment-links", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setLinks(data.links || []))
      .catch(() => setLinks([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const kpis = useMemo(() => {
    const active = links.filter((l) => l.status === "ACTIVE");
    const activeAmount = active.reduce((sum, l) => sum + l.amount, 0);
    const totalPayments = links.reduce((sum, l) => sum + l.currentPayments, 0);
    const inactive = links.length - active.length;
    return { activeCount: active.length, activeAmount, totalPayments, inactive };
  }, [links]);

  const columns = [
    { key: "name", header: "Nombre" },
    { key: "amount", header: "Monto" },
    { key: "status", header: "Estado" },
    { key: "payments", header: "Pagos" },
  ];

  function StatusBadge({ status }: { status: string }) {
    const config = statusConfig[status] || statusConfig.ACTIVE;
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  }

  function renderRow(link: PaymentLink) {
    return (
      <>
        <TableCell className="font-medium">{link.name}</TableCell>
        <TableCell>{formatCurrency(link.amount, link.currency)}</TableCell>
        <TableCell>
          <StatusBadge status={link.status} />
        </TableCell>
        <TableCell className="text-sm">
          {link.currentPayments}
          {link.maxPayments ? ` / ${link.maxPayments}` : ""}
        </TableCell>
      </>
    );
  }

  function renderCard(link: PaymentLink) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-medium">{link.name}</div>
            <div className="text-lg font-semibold">{formatCurrency(link.amount, link.currency)}</div>
          </div>
          <StatusBadge status={link.status} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Pagos recibidos</span>
          <span className="font-medium">
            {link.currentPayments}
            {link.maxPayments ? ` / ${link.maxPayments}` : ""}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-section">Links de Cobro</h1>
          <p className="body-default mt-1">Crea links de pago para compartir con clientes</p>
        </div>
        <CreatePaymentLinkDialog onCreate={() => window.location.reload()} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <KpiCard label="Links activos" value={kpis.activeCount} icon={Link2} />
        <KpiCard
          label="Monto activo"
          value={formatCurrency(kpis.activeAmount, "COP")}
          icon={DollarSign}
        />
        <KpiCard label="Pagos recibidos" value={kpis.totalPayments} icon={CheckCircle2} />
        <KpiCard label="Inactivos" value={kpis.inactive} icon={AlertCircle} />
      </div>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card">Links Activos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={links}
              renderRow={renderRow}
              renderCard={renderCard}
              loading={loading}
              emptyState={
                <EmptyStateCard
                  icon={CreditCard}
                  title="No hay links de cobro"
                  description="Crea links de pago integrados con Wompi, PayU y PSE para cobrar en línea."
                  action={<CreatePaymentLinkDialog onCreate={() => window.location.reload()} />}
                />
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
