"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { formatCurrency, formatDate as fmtDate } from "@/lib/format";
import type { Locale } from "@/lib/locale";
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
  { labelKey: string; className: string; icon: typeof CheckCircle }
> = {
  PENDING: { labelKey: "statuses.PENDING", className: "bg-amber-500/10 text-amber-400", icon: Clock },
  FILED: { labelKey: "statuses.FILED", className: "bg-blue-500/10 text-blue-400", icon: CheckCircle },
  APPROVED: { labelKey: "statuses.APPROVED", className: "bg-emerald-500/10 text-emerald-400", icon: CheckCircle },
  REJECTED: { labelKey: "statuses.REJECTED", className: "bg-red-500/10 text-red-400", icon: AlertTriangle },
  OVERDUE: { labelKey: "statuses.OVERDUE", className: "bg-red-500/10 text-red-400", icon: AlertTriangle },
};

const authorityLabelKeys: Record<string, string> = {
  DIAN: "createReportDialog.authorities.DIAN",
  SAT: "createReportDialog.authorities.SAT",
  AFIP: "createReportDialog.authorities.AFIP",
  SII: "createReportDialog.authorities.SII",
  SUNAT: "createReportDialog.authorities.SUNAT",
};

const exampleTypeLabelKeys: Record<string, string> = {
  IVA: "calculator.regime.taxTypes.IVA",
  ReteFuente: "calculator.regime.taxTypes.ReteFuente",
  ICA: "calculator.regime.taxTypes.ICA",
};

const exampleNoteKeys: Record<string, string> = {
  ivaGeneral: "examples.notes.ivaGeneral",
  reteFuenteGeneral: "examples.notes.reteFuenteGeneral",
  reteFuenteHigh: "examples.notes.reteFuenteHigh",
  icaBogota: "examples.notes.icaBogota",
  icaMedellin: "examples.notes.icaMedellin",
};

const typeLabelKeys: Record<string, string> = {
  IVA: "types.IVA",
  ISR: "types.ISR",
  RETENTION: "types.RETENTION",
  ICA: "types.ICA",
  RENTA: "types.RENTA",
  DIAN_ELECTRONIC: "types.DIAN_ELECTRONIC",
};

interface TaxExample {
  type: string;
  base: number;
  rate: number;
  tax: number;
  total: number;
  noteKey: string;
}

const taxExamples: TaxExample[] = [
  { type: "IVA", base: 1000000, rate: 19, tax: 190000, total: 1190000, noteKey: "ivaGeneral" },
  { type: "ReteFuente", base: 5000000, rate: 2.5, tax: 125000, total: 4875000, noteKey: "reteFuenteGeneral" },
  { type: "ReteFuente", base: 10000000, rate: 3.5, tax: 350000, total: 9650000, noteKey: "reteFuenteHigh" },
  { type: "ICA", base: 2000000, rate: 9.66, tax: 193200, total: 2193200, noteKey: "icaBogota" },
  { type: "ICA", base: 2000000, rate: 13.8, tax: 276000, total: 2276000, noteKey: "icaMedellin" },
];

function formatCOP(amount: number, locale: Locale) {
  return formatCurrency(amount, "COP", locale);
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
  const t = useTranslations("dashboard.tax");
  const locale = useLocale() as Locale;
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
          throw new Error(data.error || t("reportError"));
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
    { key: "type", header: t("exampleColumns.type") },
    { key: "base", header: t("exampleColumns.base"), className: "text-right" },
    { key: "rate", header: t("exampleColumns.rate"), className: "text-right" },
    { key: "tax", header: t("exampleColumns.tax"), className: "text-right" },
    { key: "total", header: t("exampleColumns.total"), className: "text-right" },
    { key: "note", header: t("exampleColumns.note") },
  ];

  const reportColumns = [
    { key: "authority", header: t("reportColumns.authority") },
    { key: "type", header: t("reportColumns.type") },
    { key: "period", header: t("reportColumns.period") },
    { key: "status", header: t("reportColumns.status") },
    { key: "due", header: t("reportColumns.due") },
  ];

  function periodLabel(report: TaxReport): string {
    if (report.period === "MONTHLY" && report.month) return `${report.month}/${report.year}`;
    if (report.period === "QUARTERLY" && report.quarter) return t("quarter", { q: report.quarter, year: report.year });
    return `${report.year}`;
  }

  function renderExampleRow(ex: TaxExample) {
    return (
      <>
        <TableCell className="font-medium">{t(exampleTypeLabelKeys[ex.type] as never) || ex.type}</TableCell>
        <TableCell className="text-right font-mono">{formatCOP(ex.base, locale)}</TableCell>
        <TableCell className="text-right font-mono">{ex.rate}%</TableCell>
        <TableCell className="text-right font-mono">{formatCOP(ex.tax, locale)}</TableCell>
        <TableCell className="text-right font-mono">{formatCOP(ex.total, locale)}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{t(exampleNoteKeys[ex.noteKey] as never)}</TableCell>
      </>
    );
  }

  function renderExampleCard(ex: TaxExample) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-medium">{t(exampleTypeLabelKeys[ex.type] as never) || ex.type}</span>
          <span className="font-mono text-sm">{ex.rate}%</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-muted-foreground">{t("exampleCard.base")}</div>
            <div className="font-mono font-medium">{formatCOP(ex.base, locale)}</div>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground">{t("exampleCard.tax")}</div>
            <div className="font-mono font-medium">{formatCOP(ex.tax, locale)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("exampleCard.total")}</div>
            <div className="font-mono font-semibold">{formatCOP(ex.total, locale)}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">{t(exampleNoteKeys[ex.noteKey] as never)}</div>
      </div>
    );
  }

  function StatusBadge({ status }: { status: string }) {
    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="mr-1 h-3 w-3" />
        {t(config.labelKey as never)}
      </Badge>
    );
  }

  function renderReportRow(report: TaxReport) {
    return (
      <>
        <TableCell className="text-sm">{t(authorityLabelKeys[report.authority] as never) || report.authority}</TableCell>
        <TableCell className="text-sm">{t(typeLabelKeys[report.type] as never) || report.type}</TableCell>
        <TableCell className="font-mono text-sm">{periodLabel(report)}</TableCell>
        <TableCell><StatusBadge status={report.status} /></TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {report.dueDate ? fmtDate(report.dueDate, locale) : "—"}
        </TableCell>
      </>
    );
  }

  function renderReportCard(report: TaxReport) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-medium">{t(typeLabelKeys[report.type] as never) || report.type}</div>
            <div className="text-sm text-muted-foreground">{t(authorityLabelKeys[report.authority] as never) || report.authority}</div>
          </div>
          <StatusBadge status={report.status} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("reportCard.period")}</span>
          <span className="font-mono">{periodLabel(report)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("reportCard.due")}</span>
          <span>{report.dueDate ? fmtDate(report.dueDate, locale) : "—"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">{t("subtitle")}</p>
        </div>
        <CreateTaxReportDialog onCreate={() => window.location.reload()} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <KpiCard label={t("kpis.iva")} value="19%" icon={Percent} />
        <KpiCard label={t("kpis.reteFuente")} value="2.5% – 3.5%" icon={Receipt} />
        <KpiCard
          label={t("kpis.ica")}
          value={t("kpis.icaValue")}
          icon={FileCheck}
          footer={
            <span className="text-xs text-muted-foreground">{t("kpis.icaFooter")}</span>
          }
        />
      </div>

      <TaxCalculator />

      <Card className="surface-elevated-2">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="heading-card">{t("reportTitle")}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="space-y-1">
                <Label htmlFor="tax-year" className="sr-only">{t("year")}</Label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger id="tax-year" className="w-[100px]">
                    <SelectValue placeholder={t("year")} />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="tax-month" className="sr-only">{t("month")}</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger id="tax-month" className="w-[130px]">
                    <SelectValue placeholder={t("month")} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {fmtDate(new Date(2024, m - 1, 1), locale, { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="tax-period" className="sr-only">{t("periodicity")}</Label>
                <Select value={periodType} onValueChange={(v) => setPeriodType(v as "MONTHLY" | "BIMONTHLY")}>
                  <SelectTrigger id="tax-period" className="w-[130px]">
                    <SelectValue placeholder={t("periodicity")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">{t("monthly")}</SelectItem>
                    <SelectItem value="BIMONTHLY">{t("bimonthly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                  <div className="text-xs text-muted-foreground">{t("report.ivaGenerated")}</div>
                  <div className="font-mono text-lg font-semibold">{formatCOP(report.iva.generated.tax, locale)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{t("report.ivaDeductible")}</div>
                  <div className="font-mono text-lg font-semibold">{formatCOP(report.iva.deductible.tax, locale)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{t("report.reteFuente")}</div>
                  <div className="font-mono text-lg font-semibold">{formatCOP(report.reteFuente.total, locale)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{t("report.ica")}</div>
                  <div className="font-mono text-lg font-semibold">{formatCOP(report.ica.amount, locale)}</div>
                  <div className="text-xs text-muted-foreground">{report.ica.city || t("report.noCity")}</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left font-medium">{t("tableHeaders.concept")}</th>
                      <th className="py-2 text-right font-medium">{t("tableHeaders.base")}</th>
                      <th className="py-2 text-right font-medium">{t("tableHeaders.rate")}</th>
                      <th className="py-2 text-right font-medium">{t("tableHeaders.tax")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td>{t("rows.ivaGenerated", { count: report.iva.generated.count })}</td>
                      <td className="text-right font-mono">{formatCOP(report.iva.generated.base, locale)}</td>
                      <td className="text-right font-mono">{(report.iva.generated.rate * 100).toFixed(0)}%</td>
                      <td className="text-right font-mono">{formatCOP(report.iva.generated.tax, locale)}</td>
                    </tr>
                    <tr>
                      <td>{t("rows.ivaDeductible", { count: report.iva.deductible.count })}</td>
                      <td className="text-right font-mono">{formatCOP(report.iva.deductible.base, locale)}</td>
                      <td className="text-right font-mono">{(report.iva.deductible.rate * 100).toFixed(0)}%</td>
                      <td className="text-right font-mono">{formatCOP(report.iva.deductible.tax, locale)}</td>
                    </tr>
                    <tr className="font-medium">
                      <td>{t("rows.ivaNet")}</td>
                      <td className="text-right font-mono" />
                      <td className="text-right font-mono" />
                      <td className="text-right font-mono">{formatCOP(report.iva.netPayable, locale)}</td>
                    </tr>
                    <tr>
                      <td>{t("rows.reteFuenteIncome", { count: report.reteFuente.onIncome.count })}</td>
                      <td className="text-right font-mono">{formatCOP(report.reteFuente.onIncome.base, locale)}</td>
                      <td className="text-right font-mono">{(report.reteFuente.onIncome.rate * 100).toFixed(1)}%</td>
                      <td className="text-right font-mono">{formatCOP(report.reteFuente.onIncome.tax, locale)}</td>
                    </tr>
                    <tr>
                      <td>{t("rows.reteFuentePayments", { count: report.reteFuente.onExpenses.count })}</td>
                      <td className="text-right font-mono">{formatCOP(report.reteFuente.onExpenses.base, locale)}</td>
                      <td className="text-right font-mono">{(report.reteFuente.onExpenses.rate * 100).toFixed(1)}%</td>
                      <td className="text-right font-mono">{formatCOP(report.reteFuente.onExpenses.tax, locale)}</td>
                    </tr>
                    <tr className="font-medium">
                      <td>{t("rows.reteFuenteTotal")}</td>
                      <td className="text-right font-mono" />
                      <td className="text-right font-mono" />
                      <td className="text-right font-mono">{formatCOP(report.reteFuente.total, locale)}</td>
                    </tr>
                    <tr>
                      <td>{t("rows.ica")} {report.ica.city ? `(${report.ica.city})` : ""}</td>
                      <td className="text-right font-mono">{formatCOP(report.ica.base, locale)}</td>
                      <td className="text-right font-mono">{(report.ica.rate * 1000).toFixed(2)}‰</td>
                      <td className="text-right font-mono">{formatCOP(report.ica.amount, locale)}</td>
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
                    <p className="font-medium">{t("draft")}</p>
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
          <CardTitle className="heading-card">{t("examplesTitle")}</CardTitle>
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
                title={t("noExamples")}
                description={t("noExamplesDesc")}
              />
            }
          />
        </CardContent>
      </Card>

      <Card className="surface-elevated-2">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="heading-card">{t("reportsTitle")}</CardTitle>
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
                  title={t("empty.title")}
                  description={t("empty.description")}
                  hint={t("empty.hint")}
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
