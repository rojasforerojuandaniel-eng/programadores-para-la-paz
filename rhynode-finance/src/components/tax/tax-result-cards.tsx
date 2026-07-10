"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDate as fmtDate } from "@/lib/format";
import type { Locale } from "@/lib/locale";
import {
  type CalculationResult,
  type TFn,
  formatCOP,
} from "@/lib/tax-calculator";
import { exportTaxPdf } from "@/components/tax/export-tax-pdf";
import { exportTaxExcel } from "@/components/tax/export-tax-excel";
import { Info, FileText, FileSpreadsheet, Receipt, Wallet, Percent, CircleDollarSign, Coins } from "lucide-react";

interface TaxResultCardsProps {
  result: CalculationResult;
  locale: Locale;
  t: TFn;
}

export function TaxResultCards({
  result,
  locale,
  t,
}: TaxResultCardsProps) {
  function handleExportPdf() {
    exportTaxPdf(result, t, locale).catch(() =>
      toast.error(t("calculator.toast.pdfError"))
    );
  }

  function handleExportExcel() {
    exportTaxExcel(result, t, locale).catch(() =>
      toast.error(t("calculator.toast.excelError"))
    );
  }
  return (
    <section
      aria-labelledby="step-4-title"
      aria-live="polite"
      className="space-y-5"
    >
      <div className="flex items-center gap-2">
        <CircleDollarSign
          className="h-5 w-5 text-primary"
          aria-hidden={true}
        />
        <h2 id="step-4-title" className="text-lg font-semibold">
          {t("calculator.steps.results.label")}
        </h2>
        <span className="text-xs text-muted-foreground">
          {t("calculator.results.estimated")}{" "}
          {t("calculator.results.generated", {
            date: fmtDate(
              new Date(result.generatedAt),
              locale,
              { dateStyle: "medium", timeStyle: "short" }
            ),
          })}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ResultCard
          icon={Coins}
          label={t("calculator.results.baseLabel")}
          value={formatCOP(result.base, locale)}
          tooltip={t("calculator.results.baseTooltip")}
          variant="muted"
        />

        {result.taxType === "IVA" && (
          <>
            <ResultCard
              icon={Percent}
              label={t("calculator.results.ivaRateLabel")}
              value={result.rateLabel}
              tooltip={t("calculator.results.ivaRateTooltip")}
              variant="muted"
            />
            <ResultCard
              icon={Receipt}
              label={t("report.ivaGenerated")}
              value={formatCOP(result.tax, locale)}
              tooltip={t("calculator.results.ivaGeneratedTooltip")}
              variant="muted"
            />
            <ResultCard
              icon={Receipt}
              label={t("report.ivaDeductible")}
              value={formatCOP(result.deductions * result.rate, locale)}
              tooltip={t("calculator.results.ivaDeductibleTooltip")}
              variant="muted"
            />
            <ResultCard
              icon={CircleDollarSign}
              label={t("rows.ivaNet")}
              value={formatCOP(result.netPayable ?? 0, locale)}
              tooltip={t("calculator.results.ivaNetTooltip")}
              variant="highlight"
            />
            <ResultCard
              icon={Wallet}
              label={t("calculator.results.totalWithIvaLabel")}
              value={formatCOP(result.total, locale)}
              tooltip={t("calculator.results.totalWithIvaTooltip")}
              variant="muted"
            />
          </>
        )}

        {result.taxType === "ReteFuente" && (
          <>
            <ResultCard
              icon={Percent}
              label={t("calculator.results.retentionRateLabel")}
              value={result.rateLabel}
              tooltip={t("calculator.results.retentionRateTooltip")}
              variant="muted"
            />
            <ResultCard
              icon={CircleDollarSign}
              label={t("calculator.results.retentionLabel")}
              value={formatCOP(result.tax, locale)}
              tooltip={t("calculator.results.retentionTooltip")}
              variant="highlight"
            />
            <ResultCard
              icon={Wallet}
              label={t("calculator.results.totalReceiveLabel")}
              value={formatCOP(result.total, locale)}
              tooltip={t("calculator.results.totalReceiveTooltip")}
              variant="muted"
            />
          </>
        )}

        {result.taxType === "ICA" && (
          <>
            <ResultCard
              icon={Percent}
              label={t("calculator.results.icaRateLabel")}
              value={result.rateLabel}
              tooltip={t("calculator.results.icaRateTooltip")}
              variant="muted"
            />
            <ResultCard
              icon={CircleDollarSign}
              label={t("report.ica")}
              value={formatCOP(result.tax, locale)}
              tooltip={t("calculator.results.icaEstimatedTooltip")}
              variant="highlight"
            />
            <ResultCard
              icon={Wallet}
              label={t("calculator.results.icaTotalLabel")}
              value={formatCOP(result.total, locale)}
              tooltip={t("calculator.results.icaTotalTooltip")}
              variant="muted"
            />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPdf}
          className="gap-2"
        >
          <FileText className="h-4 w-4" aria-hidden={true} />
          PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportExcel}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" aria-hidden={true} />
          Excel
        </Button>
      </div>

      <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
        <div className="flex items-start gap-2">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden={true}
          />
          <p>{t("calculator.disclaimer")}</p>
        </div>
      </div>
    </section>
  );
}

interface ResultCardProps {
  icon: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean;
  }>;
  label: string;
  value: string;
  tooltip: string;
  variant?: "muted" | "highlight";
}

function ResultCard({
  icon: Icon,
  label,
  value,
  tooltip,
  variant = "muted",
}: ResultCardProps) {
  const t = useTranslations("dashboard.tax");
  return (
    <div
      className={cn(
        "relative rounded-xl border p-4",
        variant === "highlight"
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-background"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "h-4 w-4",
              variant === "highlight"
                ? "text-primary"
                : "text-muted-foreground"
            )}
            aria-hidden={true}
          />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t("calculator.resultCardInfoAria", { label })}
              className="shrink-0"
            >
              <Info className="h-3.5 w-3.5" aria-hidden={true} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[14rem]">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </div>
      <div
        className={cn(
          "mt-2 text-xl font-bold tracking-tight sm:text-2xl",
          variant === "highlight" && "text-primary"
        )}
      >
        {value}
      </div>
    </div>
  );
}
