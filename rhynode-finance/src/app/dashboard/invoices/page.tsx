"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
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
import { formatCurrency, formatDate } from "@/lib/format";
import type { Invoice } from "@/components/dashboard/edit-invoice-dialog";
import type { Locale } from "@/lib/locale";

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
        <Plus className="h-4 w-4" aria-hidden="true" />
        <NewInvoiceLabel />
      </Button>
    ),
  },
);

function NewInvoiceLabel() {
  const t = useTranslations("dashboard.invoices");
  return <>{t("newInvoice")}</>;
}

const STATUS_KEYS = ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED", "PARTIAL"] as const;
const STATUS_CLASS: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-warning/10 text-warning",
  PAID: "bg-success/10 text-success",
  OVERDUE: "bg-danger/10 text-danger",
  CANCELLED: "bg-muted text-muted-foreground",
  PARTIAL: "bg-info/10 text-info",
};

const FILTER_OPTIONS = [
  { key: "ALL", labelKey: "filters.ALL" },
  { key: "PENDING", labelKey: "filters.PENDING" },
  { key: "OVERDUE", labelKey: "filters.OVERDUE" },
  { key: "PAID", labelKey: "filters.PAID" },
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

function sumInvoices(invoices: InvoiceWithItems[]): number {
  return invoices.reduce((sum, inv) => sum + toNumber(inv.total), 0);
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("dashboard.invoices.statuses");
  const className = STATUS_CLASS[status] ?? STATUS_CLASS.DRAFT;
  const key = (STATUS_KEYS as readonly string[]).includes(status) ? (status as (typeof STATUS_KEYS)[number]) : "DRAFT";
  return (
    <Badge variant="outline" className={className}>
      {t(key)}
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
  const t = useTranslations("dashboard.invoices");
  const locale = useLocale() as Locale;
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
      const name = inv.client?.name || t("noName");
      if (!map.has(id)) {
        map.set(id, name);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [invoices, t]);

  const filteredInvoices = useMemo(() => {
    let result = invoices;

    switch (filter) {
      case "PENDING":
        result = result.filter((inv) => ["SENT", "PARTIAL"].includes(inv.status));
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
    const pending = invoices.filter((inv) => ["SENT", "PARTIAL"].includes(inv.status));
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
    { key: "number", header: t("columns.number") },
    { key: "client", header: t("columns.client") },
    { key: "status", header: t("columns.status") },
    { key: "total", header: t("columns.total"), className: "text-right" },
    { key: "date", header: t("columns.date") },
    { key: "actions", header: t("columns.actions"), className: "text-right" },
  ];

  function renderRow(inv: InvoiceWithItems) {
    return (
      <>
        <TableCell className="font-mono text-sm">{inv.number}</TableCell>
        <TableCell>
          <div className="font-medium">{inv.client?.name || t("noClient")}</div>
          {inv.project?.name && (
            <div className="text-xs text-muted-foreground">{inv.project.name}</div>
          )}
        </TableCell>
        <TableCell>
          <StatusBadge status={inv.status} />
        </TableCell>
        <TableCell className="text-right">
          <div className="font-medium">{formatCurrency(toNumber(inv.total), inv.currency, locale)}</div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {formatDate(inv.issueDate, locale)}
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
            <div className="font-mono text-sm text-muted-foreground">{inv.number}</div>
            <div className="truncate font-medium">{inv.client?.name || t("noClient")}</div>
          </div>
          <StatusBadge status={inv.status} />
        </div>
        {inv.project?.name && (
          <div className="text-sm text-muted-foreground">{inv.project.name}</div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">{formatCurrency(toNumber(inv.total), inv.currency, locale)}</div>
            <div className="text-xs text-muted-foreground">{formatDate(inv.issueDate, locale)}</div>
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
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">{t("subtitle")}</p>
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
          label={t("kpis.pending")}
          value={formatCurrency(kpis.pendingAmount, "COP", locale)}
          icon={Clock}
          footer={t("kpis.invoicesCount", { count: kpis.pendingCount })}
        />
        <KpiCard
          label={t("kpis.overdue")}
          value={formatCurrency(kpis.overdueAmount, "COP", locale)}
          icon={AlertCircle}
          footer={t("kpis.invoicesCount", { count: kpis.overdueCount })}
        />
        <KpiCard
          label={t("kpis.paid")}
          value={formatCurrency(kpis.paidAmount, "COP", locale)}
          icon={CheckCircle2}
          footer={t("kpis.invoicesCount", { count: kpis.paidCount })}
        />
        <KpiCard
          label={t("kpis.outstanding")}
          value={formatCurrency(kpis.outstandingAmount, "COP", locale)}
          icon={DollarSign}
        />
      </div>

      <Card className="surface-elevated-2">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="heading-card">{t("allTitle")}</CardTitle>
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => (
                <Button
                  key={option.key}
                  variant={filter === option.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(option.key)}
                  className="h-8"
                >
                  {t(option.labelKey as never)}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="client-filter" className="text-xs">
                {t("filters2.clientLabel")}
              </Label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger id="client-filter" className="h-9">
                  <SelectValue placeholder={t("filters2.allClients")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("filters2.all")}</SelectItem>
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
                {t("filters2.from")}
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
                {t("filters2.to")}
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
                title={t("empty.title")}
                description={t("empty.description")}
                hint={t("empty.hint")}
                action={<CreateInvoiceSheet onCreate={refreshInvoices} defaultOpen={defaultOpen} />}
              />
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}