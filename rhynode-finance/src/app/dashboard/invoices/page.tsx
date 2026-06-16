"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateInvoiceSheet } from "@/components/dashboard/create-invoice-sheet";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { DataTable } from "@/components/dashboard/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TableCell } from "@/components/ui/table";
import { InvoicesSkeleton } from "@/components/dashboard/page-skeleton";
import {
  FileText,
  Trash2,
  CheckCircle,
  Send,
  Ban,
  DollarSign,
  Clock,
  CheckCircle2,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { usePlanLimit } from "@/hooks/use-plan-limit";
import { PlanLimitUpgradeCard } from "@/components/dashboard/plan-limit-upgrade-card";

interface Invoice {
  id: string;
  number: string;
  status: string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  issueDate: string;
  client?: { name?: string };
  project?: { name?: string };
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Borrador", className: "bg-muted text-muted-foreground" },
  SENT: { label: "Enviada", className: "bg-warning/10 text-warning" },
  PAID: { label: "Pagada", className: "bg-success/10 text-success" },
  OVERDUE: { label: "Vencida", className: "bg-danger/10 text-danger" },
  CANCELLED: { label: "Anulada", className: "bg-muted text-muted-foreground" },
  PARTIAL: { label: "Parcial", className: "bg-info/10 text-info" },
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const {
    allowed: canCreateInvoice,
    limit,
    current,
    planName,
    loading: planLoading,
  } = usePlanLimit("invoices");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/invoices", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setInvoices(data.invoices || []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) window.location.reload();
      else toast.error("Error al actualizar estado");
    } catch {
      toast.error("Error de red");
    }
  }

  async function deleteInvoice(id: string) {
    if (!confirm("¿Eliminar esta factura permanentemente?")) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Factura eliminada");
        window.location.reload();
      } else toast.error("Error al eliminar factura");
    } catch {
      toast.error("Error de red");
    }
  }

  const filteredInvoices = useMemo(
    () =>
      statusFilter === "ALL"
        ? invoices
        : invoices.filter((inv) => inv.status === statusFilter),
    [invoices, statusFilter]
  );

  const kpis = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const pending = invoices.filter((inv) =>
      ["SENT", "OVERDUE", "PARTIAL"].includes(inv.status)
    ).length;
    const paid = invoices.filter((inv) => inv.status === "PAID").length;
    const drafts = invoices.filter((inv) => inv.status === "DRAFT").length;
    return { total, pending, paid, drafts };
  }, [invoices]);

  const columns = [
    { key: "number", header: "Número" },
    { key: "client", header: "Cliente" },
    { key: "project", header: "Proyecto" },
    { key: "status", header: "Estado" },
    { key: "total", header: "Total", className: "text-right" },
    { key: "date", header: "Fecha" },
    { key: "actions", header: "Acciones", className: "text-right" },
  ];

  function StatusBadge({ status }: { status: string }) {
    const config = statusConfig[status] || statusConfig.DRAFT;
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  }

  function renderRow(inv: Invoice) {
    return (
      <>
        <TableCell className="font-mono text-sm">{inv.number}</TableCell>
        <TableCell>{inv.client?.name || "—"}</TableCell>
        <TableCell className="text-sm">{inv.project?.name || "—"}</TableCell>
        <TableCell>
          <StatusBadge status={inv.status} />
        </TableCell>
        <TableCell className="text-right">
          <div className="font-medium">{formatCurrency(inv.total, inv.currency)}</div>
          <div className="text-xs text-muted-foreground">
            IVA {inv.taxRate || 19}%: {formatCurrency(inv.taxAmount || 0, inv.currency)}
          </div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {new Date(inv.issueDate).toLocaleDateString("es-CO")}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            {inv.status === "DRAFT" && (
              <button
                onClick={() => updateStatus(inv.id, "SENT")}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-warning transition-colors hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Marcar como Enviada"
                aria-label="Marcar como Enviada"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
            {inv.status === "SENT" && (
              <button
                onClick={() => updateStatus(inv.id, "PAID")}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-success transition-colors hover:bg-success/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Marcar como Pagada"
                aria-label="Marcar como Pagada"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
            )}
            {(inv.status === "SENT" || inv.status === "DRAFT") && (
              <button
                onClick={() => updateStatus(inv.id, "CANCELLED")}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Anular"
                aria-label="Anular"
              >
                <Ban className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => deleteInvoice(inv.id)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Eliminar"
              aria-label="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </TableCell>
      </>
    );
  }

  function renderCard(inv: Invoice) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-sm text-muted-foreground">{inv.number}</div>
            <div className="font-medium">{inv.client?.name || "Sin cliente"}</div>
          </div>
          <StatusBadge status={inv.status} />
        </div>
        {inv.project?.name && (
          <div className="text-sm text-muted-foreground">{inv.project.name}</div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{formatCurrency(inv.total, inv.currency)}</div>
            <div className="text-xs text-muted-foreground">
              IVA {inv.taxRate || 19}%: {formatCurrency(inv.taxAmount || 0, inv.currency)}
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            {new Date(inv.issueDate).toLocaleDateString("es-CO")}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
          {inv.status === "DRAFT" && (
            <button
              onClick={() => updateStatus(inv.id, "SENT")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-warning transition-colors hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Marcar como Enviada"
              aria-label="Marcar como Enviada"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
          {inv.status === "SENT" && (
            <button
              onClick={() => updateStatus(inv.id, "PAID")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-success transition-colors hover:bg-success/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Marcar como Pagada"
              aria-label="Marcar como Pagada"
            >
              <CheckCircle className="h-4 w-4" />
            </button>
          )}
          {(inv.status === "SENT" || inv.status === "DRAFT") && (
            <button
              onClick={() => updateStatus(inv.id, "CANCELLED")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Anular"
              aria-label="Anular"
            >
              <Ban className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => deleteInvoice(inv.id)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Eliminar"
            aria-label="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
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
          <p className="body-default mt-1">Gestiona tus facturas electrónicas</p>
        </div>
        {planLoading || canCreateInvoice ? (
          <CreateInvoiceSheet onCreate={() => window.location.reload()} />
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
          label="Pendientes"
          value={kpis.pending}
          icon={Clock}
        />
        <KpiCard
          label="Pagadas"
          value={kpis.paid}
          icon={CheckCircle2}
        />
        <KpiCard
          label="Borradores"
          value={kpis.drafts}
          icon={PenLine}
        />
      </div>

      <Card className="surface-elevated-2">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="heading-card">Todas las Facturas</CardTitle>
            <div className="space-y-1.5">
              <Label htmlFor="invoice-status-filter" className="sr-only sm:not-sr-only">
                Filtrar por estado
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="invoice-status-filter" className="w-full sm:w-40">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="DRAFT">Borrador</SelectItem>
                  <SelectItem value="SENT">Enviada</SelectItem>
                  <SelectItem value="PAID">Pagada</SelectItem>
                  <SelectItem value="OVERDUE">Vencida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
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
                  title="Factura electrónicamente"
                  description="Crea facturas compatibles con DIAN, SAT o AFIP y da seguimiento a sus pagos."
                  hint="Empieza creando tu primera factura."
                  action={<CreateInvoiceSheet onCreate={() => window.location.reload()} />}
                />
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
