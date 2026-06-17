"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useSearchParams } from "next/navigation";
import { PlanLimitUpgradeCard } from "@/components/dashboard/plan-limit-upgrade-card";
import { InvoiceActions } from "@/components/dashboard/invoice-actions";
import type { Invoice } from "@/components/dashboard/edit-invoice-dialog";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount?: number;
  total?: number;
}

interface InvoiceWithItems extends Invoice {
  clientId?: string;
  items: InvoiceItem[];
}

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

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber: () => number }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function sumInvoices(invoices: InvoiceWithItems[]): number {
  return invoices.reduce((sum, inv) => sum + toNumber(inv.total), 0);
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.DRAFT;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

async function fetchInvoices(signal?: AbortSignal): Promise<InvoiceWithItems[]> {
  try {
    const res = await fetch("/api/invoices", { signal });
    const data = await res.json();
    return data.invoices || [];
  } catch {
    return [];
  }
}

export default function InvoicesPage() {
  const searchParams = useSearchParams();
  const defaultOpen = searchParams.get("new") === "1";
  const [invoices, setInvoices] = useState<InvoiceWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [clientFilter, setClientFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
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

  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const inv of invoices) {
      const id = inv.clientId || inv.client?.name || "";
      if (!id) continue;
      const name = inv.client?.name || "Sin nombre";
      if (!map.has(id)) {
        map.set(id, name);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    let result = invoices;

    switch (filter) {
      case "PENDING":
        result = result.filter((inv) =>
          ["SENT", "PARTIAL"].includes(inv.status),
        );
        break;
      case "OVERDUE":
        result = result.filter((inv) => inv.status === "OVERDUE");
        break;
      case "PAID":
        result = result.filter((inv) => inv.status === "PAID");
        break;
    }

    if (clientFilter !== "ALL") {
      result = result.filter(
        (inv) => inv.clientId === clientFilter || inv.client?.name === clientFilter,
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((inv) => new Date(inv.issueDate) >= from);
    }

    if (dateTo) {
      const to = endOfDay(new Date(dateTo));
      result = result.filter((inv) => new Date(inv.issueDate) <= to);
    }

    return result;
  }, [invoices, filter, clientFilter, dateFrom, dateTo]);

  const kpis = useMemo(() => {
    const pending = invoices.filter((inv) =>
      ["SENT", "PARTIAL"].includes(inv.status),
    );
    const overdue = invoices.filter((inv) => inv.status === "OVERDUE");
    const paid = invoices.filter((inv) => inv.status === "PAID");
    const outstanding = [...pending, ...overdue];

    return {
      pendingCount: pending.length,
      pendingAmount: sumInvoices(pending),
      overdueCount: overdue.length,
      overdueAmount: sumInvoices(overdue),
      paidCount: paid.length,
      paidAmount: sumInvoices(paid),
      outstandingAmount: sumInvoices(outstanding),
    };
  }, [invoices]);

  const columns = [
    { key: "number", header: "Número" },
    { key: "client", header: "Cliente" },
    { key: "status", header: "Estado" },
    { key: "total", header: "Total", className: "text-right" },
    { key: "date", header: "Fecha" },
    { key: "actions", header: "Acciones", className: "text-right" },
  ];

  function renderRow(inv: InvoiceWithItems) {
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
            {formatCurrency(toNumber(inv.total), inv.currency)}
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

  function renderCard(inv: InvoiceWithItems) {
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
              {formatCurrency(toNumber(inv.total), inv.currency)}
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
          <CreateInvoiceSheet onCreate={refreshInvoices} defaultOpen={defaultOpen} />
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
          label="Pendientes"
          value={formatCurrency(kpis.pendingAmount, "COP")}
          icon={Clock}
          footer={`${kpis.pendingCount} facturas`}
        />
        <KpiCard
          label="Vencidas"
          value={formatCurrency(kpis.overdueAmount, "COP")}
          icon={AlertCircle}
          footer={`${kpis.overdueCount} facturas`}
        />
        <KpiCard
          label="Pagadas"
          value={formatCurrency(kpis.paidAmount, "COP")}
          icon={CheckCircle2}
          footer={`${kpis.paidCount} facturas`}
        />
        <KpiCard
          label="Total por cobrar"
          value={formatCurrency(kpis.outstandingAmount, "COP")}
          icon={DollarSign}
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

          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="client-filter" className="text-xs">
                Cliente
              </Label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger id="client-filter" className="h-9">
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  {clientOptions.map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date-from" className="text-xs">
                Desde
              </Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date-to" className="text-xs">
                Hasta
              </Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9"
              />
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
                  <CreateInvoiceSheet onCreate={refreshInvoices} defaultOpen={defaultOpen} />
                }
              />
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
