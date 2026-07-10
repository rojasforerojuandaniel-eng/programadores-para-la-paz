import { formatDate as fmtDate } from "@/lib/format";
import type { Locale } from "@/lib/locale";
import {
  type CalculationResult,
  type TFn,
  downloadBlob,
  formatCOP,
  getIcaCityLabel,
} from "@/lib/tax-calculator";

export async function exportTaxExcel(
  result: CalculationResult,
  t: TFn,
  locale: Locale
) {
  const XLSX = await import("xlsx");
  const rows = [
    { Concepto: t("calculator.regime.taxTypeLabel"), Valor: result.taxType },
    {
      Concepto: t("calculator.results.baseLabel"),
      Valor: formatCOP(result.base, locale),
    },
    { Concepto: t("calculator.pdf.rows.rate"), Valor: result.rateLabel },
    {
      Concepto: t("calculator.pdf.rows.estimatedTax"),
      Valor: formatCOP(result.tax, locale),
    },
    {
      Concepto: t("exampleColumns.total"),
      Valor: formatCOP(result.total, locale),
    },
    ...(result.netPayable !== undefined
      ? [
          {
            Concepto: t("rows.ivaNet"),
            Valor: formatCOP(result.netPayable, locale),
          },
        ]
      : []),
    ...(result.city
      ? [
          {
            Concepto: t("calculator.pdf.rows.icaCity"),
            Valor: getIcaCityLabel(result.city, t),
          },
        ]
      : []),
    {
      Concepto: t("calculator.excel.generated"),
      Valor: fmtDate(new Date(result.generatedAt), locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    },
    {
      Concepto: t("calculator.pdf.disclaimerHeading"),
      Valor: t("calculator.excel.disclaimerBody"),
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, t("calculator.excel.sheetName"));
  const buffer = new Uint8Array(
    XLSX.write(workbook, { type: "array", bookType: "xlsx" })
  );
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "calculo-impuestos.xlsx"
  );
}
