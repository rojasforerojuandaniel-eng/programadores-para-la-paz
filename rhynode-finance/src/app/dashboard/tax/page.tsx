"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateTaxReportDialog } from "@/components/dashboard/create-tax-report-dialog";
import { TaxCalculator } from "@/components/dashboard/tax-calculator";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { DataTable } from "@/components/dashboard/data-table";
import { TableCell } from "@/components/ui/table";
import {
  Loader2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Percent,
  Receipt,
  FileCheck,
  FileText,
  FileSpreadsheet,
  Download,
  AlertCircle,
} from "lucide-react";
import type { ColombianTaxReport } from "@/lib/tax-reports";

interface TaxReport {
  id: string;
  status: string;
  authority: string;
  type: string;
  period: string;
  year: number;
  month?: number;
  quarter?: number;
  dueDate?: string;
}

const statusConfig: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle }
> = {
  PENDING: {
    label: "Pendiente",
    className: "bg-amber-500/10 text-amber-400",
    icon: Clock,
  },
  FILED: {
    label: "Presentado",
    className: "bg-blue-500/10 text-blue-400",
    icon: CheckCircle,
  },
  APPROVED: {
    label: "Aprobado",
    className: "bg-emerald-500/10 text-emerald-400",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Rechazado",
    className: "bg-red-500/10 text-red-400",
    icon: AlertTriangle,
  },
  OVERDUE: {
    label: "Vencido",
    className: "bg-red-500/10 text-red-400",
    icon: AlertTriangle,
  },
};

const authorityLabels: Record<string, string> = {
  DIAN: "DIAN (Colombia)",
  SAT: "SAT (México)",
  AFIP: "AFIP (Argentina)",
  SII: "SII (Chile)",
  SUNAT: "SUNAT (Perú)",
};

const typeLabels: Record<string, string> = {
  IVA: "IVA / VAT",
  ISR: "ISR",
  RETENTION: "Retención",
  ICA: "ICA",
  RENTA: "Renta",
  DIAN_ELECTRONIC: "Factura Electrónica",
};

interface TaxExample {
  type: string;
  base: number;
  rate: number;
  tax: number;
  total: number;
  note: string;
}

const taxExamples: TaxExample[] = [
  { type: "IVA", base: 1000000, rate: 19, tax: 190000, total: 1190000, note: "Bienes y servicios gravados" },
  { type: "ReteFuente", base: 5000000, rate: 2.5, tax: 125000, total: 4875000, note: "Servicios generales" },
  { type: "ReteFuente", base: 10000000, rate: 3.5, tax: 350000, total: 9650000, note: "Servicios de alta valor" },
  { type: "ICA", base: 2000000, rate: 9.66, tax: 193200, total: 2193200, note: "Bogotá (9.66/1000)" },
  { type: "ICA", base: 2000000, rate: 13.8, tax: 276000, total: 2276000, note: "Medellín (13.8/1000)" },
];

function formatCOP(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getReportUrl(
  year: number,
  month: number,
  periodType: string,
  format: string
): string {
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
    periodType,
    format,
  });
  return `/api/tax/reports?${params.toString()}`;
}

export default function TaxPage() {
  const [reports, setReports] = useState<TaxReport[]>([]);
  const [loading, setLoading] = useState(true);

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [periodType, setPeriodType] = useState<"MONTHLY" | "BIMONTHLY">("MONTHLY");
  const [report, setReport] = useState<ColombianTaxReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => current - 3 + i);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/tax-reports", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => setReports(data.reports || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch(getReportUrl(year, month, periodType, "json"), { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Error al generar el reporte");
        }
        return res.json() as Promise<ColombianTaxReport>;
      })
      .then((data) => {
        setReport(data);
        setReportError(null);
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") {
          setReportError(error.message);
        }
      })
      .finally(() => setLoadingReport(false));

    return () => controller.abort();
  }, [year, month, periodType]);

  const exampleColumns = [
    { key: "type", header: "Tipo" },
    { key: "base", header: "Base", className: "text-right" },
    { key: "rate", header: "Tasa", className: "text-right" },
    { key: "tax", header: "Impuesto", className: "text-right" },
    { key: "total", header: "Total", className: "text-right" },
    { key: "note", header: "Nota" },
  ];

  const reportColumns = [
    { key: "authority", header: "Autoridad" },
    { key: "type", header: "Tipo" },
    { key: "period", header: "Período" },
    { key: "status", header: "Estado" },
    { key: "due", header: "Vencimiento" },
  ];

  function renderExampleRow(ex: TaxExample) {
    return (
      <>
        <TableCell className="font-medium">{ex.type}</TableCell>
        <TableCell className="text-right font-mono">{formatCOP(ex.base)}</TableCell>
        <TableCell className="text-right font-mono">{ex.rate}%</TableCell>
        <TableCell className="text-right font-mono">{formatCOP(ex.tax)}</TableCell>
        <TableCell className="text-right font-mono">{formatCOP(ex.total)}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{ex.note}</TableCell>
      </>
    );
  }

  function renderExampleCard(ex: TaxExample) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-medium">{ex.type}</span>
          <span className="font-mono text-sm">{ex.rate}%</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-muted-foreground">Base</div>
            <div className="font-mono font-medium">{formatCOP(ex.base)}</div>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground">Impuesto</div>
            <div className="font-mono font-medium">{formatCOP(ex.tax)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total</div>
            <div className="font-mono font-semibold">{formatCOP(ex.total)}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">{ex.note}</div>
      </div>
    );
  }

  function StatusBadge({ status }: { status: string }) {
    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  }

  function renderReportRow(report: TaxReport) {
    const periodLabel =
      report.period === "MONTHLY" && report.month
        ? `${report.month}/${report.year}`
        : report.period === "QUARTERLY" && report.quarter
        ? `Q${report.quarter} ${report.year}`
        : `${report.year}`;
    return (
      <>
        <TableCell className="text-sm">{authorityLabels[report.authority] || report.authority}</TableCell>
        <TableCell className="text-sm">{typeLabels[report.type] || report.type}</TableCell>
        <TableCell className="font-mono text-sm">{periodLabel}</TableCell>
        <TableCell>
          <StatusBadge status={report.status} />
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {report.dueDate
            ? new Date(report.dueDate).toLocaleDateString("es-CO")
            : "—"}
        </TableCell>
      </>
    );
  }

  function renderReportCard(report: TaxReport) {
    const periodLabel =
      report.period === "MONTHLY" && report.month
        ? `${report.month}/${report.year}`
        : report.period === "QUARTERLY" && report.quarter
        ? `Q${report.quarter} ${report.year}`
        : `${report.year}`;
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-medium">
              {typeLabels[report.type] || report.type}
            </div>
            <div className="text-sm text-muted-foreground">
              {authorityLabels[report.authority] || report.authority}
            </div>
          </div>
          <StatusBadge status={report.status} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Período</span>
          <span className="font-mono">{periodLabel}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Vencimiento</span>
          <span>
            {report.dueDate
              ? new Date(report.dueDate).toLocaleDateString("es-CO")
              : "—"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-section">Impuestos y Compliance</h1>
          <p className="body-default mt-1">Calendario fiscal y reportes de cumplimiento</p>
        </div>
        <CreateTaxReportDialog onCreate={() => window.location.reload()} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <KpiCard label="IVA" value="19%" icon={Percent} />
        <KpiCard label="ReteFuente" value="2.5% – 3.5%" icon={Receipt} />
        <KpiCard
          label="ICA"
          value="Variable"
          icon={FileCheck}
          footer={
            <span className="text-xs text-muted-foreground">Según tarifa del municipio (ej. Bogotá 9.66‰)</span>
          }
        />
      </div>

      <TaxCalculator />

      <Card className="surface-elevated-2">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="heading-card">Reporte Fiscal Colombia</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-[100px]" aria-label="Año">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-[130px]" aria-label="Mes">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {new Date(2024, m - 1, 1).toLocaleDateString("es-CO", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={periodType} onValueChange={(v) => setPeriodType(v as "MONTHLY" | "BIMONTHLY")}>
                <SelectTrigger className="w-[130px]" aria-label="Periodicidad">
                  <SelectValue placeholder="Periodicidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Mensual</SelectItem>
                  <SelectItem value="BIMONTHLY">Bimestral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingReport ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : reportError ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-sm text-muted-foreground">{reportError}</p>
            </div>
          ) : report ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">IVA generado</div>
                  <div className="font-mono text-lg font-semibold">{formatCOP(report.iva.generated.tax)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">IVA descontable estimado</div>
                  <div className="font-mono text-lg font-semibold">{formatCOP(report.iva.deductible.tax)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">ReteFuente estimada</div>
                  <div className="font-mono text-lg font-semibold">{formatCOP(report.reteFuente.total)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">ICA estimado</div>
                  <div className="font-mono text-lg font-semibold">{formatCOP(report.ica.amount)}</div>
                  <div className="text-xs text-muted-foreground">{report.ica.city || "Sin ciudad"}</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left font-medium">Concepto</th>
                      <th className="py-2 text-right font-medium">Base</th>
                      <th className="py-2 text-right font-medium">Tasa</th>
                      <th className="py-2 text-right font-medium">Impuesto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td>IVA generado ({report.iva.generated.count} facturas)</td>
                      <td className="text-right font-mono">{formatCOP(report.iva.generated.base)}</td>
                      <td className="text-right font-mono">{(report.iva.generated.rate * 100).toFixed(0)}%</td>
                      <td className="text-right font-mono">{formatCOP(report.iva.generated.tax)}</td>
                    </tr>
                    <tr>
                      <td>IVA descontable estimado ({report.iva.deductible.count} gastos)</td>
                      <td className="text-right font-mono">{formatCOP(report.iva.deductible.base)}</td>
                      <td className="text-right font-mono">{(report.iva.deductible.rate * 100).toFixed(0)}%</td>
                      <td className="text-right font-mono">{formatCOP(report.iva.deductible.tax)}</td>
                    </tr>
                    <tr className="font-medium">
                      <td>IVA neto a pagar</td>
                      <td className="text-right font-mono" />
                      <td className="text-right font-mono" />
                      <td className="text-right font-mono">{formatCOP(report.iva.netPayable)}</td>
                    </tr>
                    <tr>
                      <td>ReteFuente sobre ingresos ({report.reteFuente.onIncome.count} facturas)</td>
                      <td className="text-right font-mono">{formatCOP(report.reteFuente.onIncome.base)}</td>
                      <td className="text-right font-mono">{(report.reteFuente.onIncome.rate * 100).toFixed(1)}%</td>
                      <td className="text-right font-mono">{formatCOP(report.reteFuente.onIncome.tax)}</td>
                    </tr>
                    <tr>
                      <td>ReteFuente practicada en pagos ({report.reteFuente.onExpenses.count} gastos)</td>
                      <td className="text-right font-mono">{formatCOP(report.reteFuente.onExpenses.base)}</td>
                      <td className="text-right font-mono">{(report.reteFuente.onExpenses.rate * 100).toFixed(1)}%</td>
                      <td className="text-right font-mono">{formatCOP(report.reteFuente.onExpenses.tax)}</td>
                    </tr>
                    <tr className="font-medium">
                      <td>Total ReteFuente estimada</td>
                      <td className="text-right font-mono" />
                      <td className="text-right font-mono" />
                      <td className="text-right font-mono">{formatCOP(report.reteFuente.total)}</td>
                    </tr>
                    <tr>
                      <td>ICA {report.ica.city ? `(${report.ica.city})` : ""}</td>
                      <td className="text-right font-mono">{formatCOP(report.ica.base)}</td>
                      <td className="text-right font-mono">{(report.ica.rate * 1000).toFixed(2)}‰</td>
                      <td className="text-right font-mono">{formatCOP(report.ica.amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={getReportUrl(year, month, periodType, "csv")}
                    download
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    CSV
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={getReportUrl(year, month, periodType, "xlsx")}
                    download
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={getReportUrl(year, month, periodType, "pdf")}
                    download
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </a>
                </Button>
              </div>

              <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-medium">Borrador orientativo</p>
                    {report.disclaimers.map((d, i) => (
                      <p key={i} className="text-xs opacity-90">{d}</p>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card">Ejemplos de Cálculo</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={exampleColumns}
            data={taxExamples}
            renderRow={renderExampleRow}
            renderCard={renderExampleCard}
            emptyState={
              <EmptyStateCard
                variant="md"
                icon={Receipt}
                title="Sin ejemplos disponibles"
                description="Aquí verás cálculos de impuestos de referencia cuando estén disponibles."
              />
            }
          />
        </CardContent>
      </Card>

      <Card className="surface-elevated-2">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="heading-card">Reportes Fiscales</CardTitle>
            <CreateTaxReportDialog onCreate={() => window.location.reload()} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <DataTable
              columns={reportColumns}
              data={reports}
              renderRow={renderReportRow}
              renderCard={renderReportCard}
              loading={loading}
              emptyState={
                <EmptyStateCard
                  variant="lg"
                  icon={ShieldCheck}
                  title="Mantén el compliance al día"
                  description="Crea reportes de IVA, ISR, retenciones y presentación ante DIAN, SAT o AFIP."
                  hint="Empieza creando tu primer reporte fiscal."
                  action={<CreateTaxReportDialog onCreate={() => window.location.reload()} />}
                />
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
