"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { DataTable } from "@/components/dashboard/data-table";
import { TableCell } from "@/components/ui/table";
import { InvoicesSkeleton } from "@/components/dashboard/page-skeleton";
import {
  FileText,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { usePlanLimit } from "@/hooks/use-plan-limit";
import { PlanLimitUpgradeCard } from "@/components/dashboard/plan-limit-upgrade-card";
import { InvoiceActions } from "@/components/dashboard/invoice-actions";
import type { Invoice } from "@/components/dashboard/edit-invoice-dialog";

const CreateInvoiceSheet = dynamic(
  () =>
    import("@/components/dashboard/create-invoice-sheet").then(
      (mod) => mod.CreateInvoiceSheet,
    ),
  {
    loading: () => (
      <Button className="gap-2" disabled>
        <Plus className="h-4 w-4" />
        Nueva Factura
      </Button>
    ),
  },
);

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Borrador", className: "bg-muted text-muted-foreground" },
  SENT: { label: "Enviada", className: "bg-warning/10 text-warning" },
  PAID: { label: "Pagada", className: "bg-success/10 text-success" },
  OVERDUE: { label: "Vencida", className: "bg-danger/10 text-danger" },
  CANCELLED: { label: "Anulada", className: "bg-muted text-muted-foreground" },
  PARTIAL: { label: "Parcial", className: "bg-info/10 text-info" },
};

const FILTER_OPTIONS = [
  { key: "ALL", label: "Todos" },
  { key: "PENDING", label: "Pendientes" },
  { key: "OVERDUE", label: "Vencidas" },
  { key: "PAID", label: "Pagadas" },
] as const;

type FilterKey = (typeof FILTER_OPTIONS)[number]["key"];

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.DRAFT;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

async function fetchInvoices(signal?: AbortSignal): Promise<Invoice[]> {
  try {
    const res = await fetch("/api/invoices", { signal });
    const data = await res.json();
    return data.invoices || [];
  } catch {
    return [];
  }
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const {
    allowed: canCreateInvoice,
    limit,
    current,
    planName,
    loading: planLoading,
  } = usePlanLimit("invoices");

  useEffect(() => {
    const controller = new AbortController();
    fetchInvoices(controller.signal)
      .then((data) => setInvoices(data))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const refreshInvoices = () => {
    setLoading(true);
    fetchInvoices()
      .then((data) => setInvoices(data))
      .finally(() => setLoading(false));
  };

  const filteredInvoices = useMemo(() => {
    switch (filter) {
      case "PENDING":
        return invoices.filter((inv) =>
          ["SENT", "PARTIAL"].includes(inv.status),
        );
      case "OVERDUE":
        return invoices.filter((inv) => inv.status === "OVERDUE");
      case "PAID":
        return invoices.filter((inv) => inv.status === "PAID");
      default:
        return invoices;
    }
  }, [invoices, filter]);

  const kpis = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const pending = invoices
      .filter((inv) => ["SENT", "PARTIAL"].includes(inv.status))
      .reduce((sum, inv) => sum + inv.total, 0);
    const overdue = invoices
      .filter((inv) => inv.status === "OVERDUE")
      .reduce((sum, inv) => sum + inv.total, 0);
    const paid = invoices
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + inv.total, 0);
    return { total, pending, overdue, paid };
  }, [invoices]);

  const columns = [
    { key: "number", header: "Número" },
    { key: "client", header: "Cliente" },
    { key: "status", header: "Estado" },
    { key: "total", header: "Total", className: "text-right" },
    { key: "date", header: "Fecha" },
    { key: "actions", header: "Acciones", className: "text-right" },
  ];

  function renderRow(inv: Invoice) {
    return (
      <>
        <TableCell className="font-mono text-sm">{inv.number}</TableCell>
        <TableCell>
          <div className="font-medium">{inv.client?.name || "Sin cliente"}</div>
          {inv.project?.name && (
            <div className="text-xs text-muted-foreground">{inv.project.name}</div>
          )}
        </TableCell>
        <TableCell>
          <StatusBadge status={inv.status} />
        </TableCell>
        <TableCell className="text-right">
          <div className="font-medium">
            {formatCurrency(inv.total, inv.currency)}
          </div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {new Date(inv.issueDate).toLocaleDateString("es-CO")}
        </TableCell>
        <TableCell className="text-right">
          <InvoiceActions invoice={inv} onRefresh={refreshInvoices} />
        </TableCell>
      </>
    );
  }

  function renderCard(inv: Invoice) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-sm text-muted-foreground">
              {inv.number}
            </div>
            <div className="truncate font-medium">
              {inv.client?.name || "Sin cliente"}
            </div>
          </div>
          <StatusBadge status={inv.status} />
        </div>
        {inv.project?.name && (
          <div className="text-sm text-muted-foreground">{inv.project.name}</div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">
              {formatCurrency(inv.total, inv.currency)}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(inv.issueDate).toLocaleDateString("es-CO")}
            </div>
          </div>
          <InvoiceActions invoice={inv} onRefresh={refreshInvoices} />
        </div>
      </div>
    );
  }

  if (loading) return <InvoicesSkeleton />;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-section">Facturas</h1>
          <p className="body-default mt-1">
            Gestiona tus facturas electrónicas
          </p>
        </div>
        {planLoading || canCreateInvoice ? (
          <CreateInvoiceSheet onCreate={refreshInvoices} />
        ) : (
          <PlanLimitUpgradeCard
            planName={planName}
            resource="invoices"
            limit={limit}
            current={current}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <KpiCard
          label="Total facturado"
          value={formatCurrency(kpis.total, "COP")}
          icon={DollarSign}
        />
        <KpiCard
          label="Pendiente"
          value={formatCurrency(kpis.pending, "COP")}
          icon={Clock}
        />
        <KpiCard
          label="Vencido"
          value={formatCurrency(kpis.overdue, "COP")}
          icon={AlertCircle}
        />
        <KpiCard
          label="Pagado"
          value={formatCurrency(kpis.paid, "COP")}
          icon={CheckCircle2}
        />
      </div>

      <Card className="surface-elevated-2">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="heading-card">Todas las Facturas</CardTitle>
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => (
                <Button
                  key={option.key}
                  variant={filter === option.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(option.key)}
                  className="h-8"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredInvoices}
            renderRow={renderRow}
            renderCard={renderCard}
            loading={loading}
            emptyState={
              <EmptyStateCard
                variant="lg"
                icon={FileText}
                title="No hay facturas aún"
                description="Crea tu primera factura para empezar a facturar y dar seguimiento a pagos."
                hint="Todas tus facturas electrónicas aparecerán aquí."
                action={
                  <CreateInvoiceSheet onCreate={refreshInvoices} />
                }
              />
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
