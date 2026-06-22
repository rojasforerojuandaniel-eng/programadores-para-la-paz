import { Prisma } from "@/generated/prisma/client";
import type { Invoice, Transaction } from "@/generated/prisma/client";
import { decimalToNumber } from "@/lib/decimal";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Locale } from "@/lib/locale";
import * as XLSX from "xlsx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type TaxPeriodType = "MONTHLY" | "BIMONTHLY";

export interface TaxPeriodFilter {
  year: number;
  month?: number;
  periodType: TaxPeriodType;
}

export interface TaxReportLine {
  concept: string;
  base: number;
  rate: number;
  tax: number;
  count: number;
  note: string;
}

export interface ColombianTaxReport {
  period: {
    periodType: TaxPeriodType;
    year: number;
    month?: number;
    bimester?: number;
    label: string;
  };
  generatedAt: string;
  currency: string;
  disclaimers: string[];
  iva: {
    generated: TaxReportLine;
    deductible: TaxReportLine;
    netPayable: number;
  };
  reteFuente: {
    onIncome: TaxReportLine;
    onExpenses: TaxReportLine;
    total: number;
    note: string;
  };
  ica: {
    city?: string;
    rate: number;
    base: number;
    amount: number;
    note: string;
  };
  summary: {
    totalInvoiced: number;
    totalIncomeTransactions: number;
    totalExpenseTransactions: number;
  };
}

type InvoiceInput = Pick<
  Invoice,
  | "id"
  | "status"
  | "issueDate"
  | "paidAt"
  | "subtotal"
  | "taxRate"
  | "taxAmount"
  | "total"
  | "currency"
> & {
  client?: { city?: string | null } | null;
};

type TransactionInput = Pick<
  Transaction,
  "id" | "type" | "category" | "description" | "amount" | "currency" | "date" | "location"
>;

const IVA_RATE = new Prisma.Decimal(0.19);
const DRAFT_OR_CANCELLED = new Set(["DRAFT", "CANCELLED"]);

const ICA_RATES: Record<string, number> = {
  Bogotá: 0.00968,
  Medellín: 0.0085,
  Cali: 0.009,
  Barranquilla: 0.007,
};

const IVA_DEDUCTIBLE_CATEGORIES = new Set([
  "Mercado",
  "Restaurante",
  "Transporte",
  "Transporte / Delivery",
  "Telecomunicaciones",
  "Servicios públicos",
  "Seguros",
  "Salud",
  "Educación",
  "Ropa",
  "Viajes",
  "Compras",
  "Otros",
]);

/** Pure inline es/en bifurcation. No message catalogs. */
const tr = (locale: Locale, es: string, en: string): string =>
  locale === "en" ? en : es;

function isInPeriod(
  date: Date,
  filter: TaxPeriodFilter
): boolean {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  if (year !== filter.year) return false;
  if (!filter.month) return true;

  if (filter.periodType === "MONTHLY") {
    return month === filter.month;
  }

  const bimester = Math.ceil(filter.month / 2);
  const itemBimester = Math.ceil(month / 2);
  return itemBimester === bimester;
}


function addDecimals(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
  return a.plus(b);
}

export function formatCOP(amount: number, locale: Locale = "es"): string {
  return formatCurrency(amount, "COP", locale);
}

function getReteFuenteRate(amount: Prisma.Decimal): number {
  const num = decimalToNumber(amount);
  if (num <= 1_000_000) return 0;
  if (num <= 5_000_000) return 0.01;
  if (num <= 10_000_000) return 0.02;
  if (num <= 50_000_000) return 0.03;
  return 0.04;
}

function buildPeriodLabel(filter: TaxPeriodFilter, locale: Locale): string {
  if (filter.periodType === "MONTHLY" && filter.month) {
    const date = new Date(filter.year, filter.month - 1, 1);
    return formatDate(date, locale, { year: "numeric", month: "long" });
  }
  if (filter.periodType === "BIMONTHLY" && filter.month) {
    const bimester = Math.ceil(filter.month / 2);
    return tr(
      locale,
      `${filter.year} - Bimestre ${bimester}`,
      `${filter.year} - Bimester ${bimester}`
    );
  }
  return String(filter.year);
}

function detectCity(
  invoices: InvoiceInput[],
  transactions: TransactionInput[],
  orgMetadata?: Record<string, unknown> | null
): string | undefined {
  const orgCity = orgMetadata?.city;
  if (typeof orgCity === "string" && orgCity.trim()) {
    return orgCity.trim();
  }

  const locations = transactions
    .map((tx) => tx.location)
    .filter((loc): loc is string => Boolean(loc));
  if (locations.length === 0) {
    const clientCities = invoices
      .map((inv) => inv.client?.city)
      .filter((city): city is string => Boolean(city));
    if (clientCities.length > 0) {
      return clientCities[0];
    }
    return undefined;
  }

  const counts = new Map<string, number>();
  for (const loc of locations) {
    counts.set(loc, (counts.get(loc) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
}

export interface TaxReportOptions {
  currency?: string;
  orgMetadata?: Record<string, unknown> | null;
  locale?: Locale;
}

export function calculateColombianTaxReport(
  invoices: InvoiceInput[],
  transactions: TransactionInput[],
  filter: TaxPeriodFilter,
  options: TaxReportOptions = {}
): ColombianTaxReport {
  const currency = options.currency ?? "COP";
  const locale: Locale = options.locale ?? "es";
  const periodInvoices = invoices.filter((inv) => isInPeriod(inv.issueDate, filter));
  const periodTransactions = transactions.filter((tx) => isInPeriod(tx.date, filter));

  // IVA generado: facturas emitidas/pagadas (excluye borradores y anuladas)
  const activeInvoices = periodInvoices.filter(
    (inv) => !DRAFT_OR_CANCELLED.has(inv.status)
  );
  const generatedBase = activeInvoices
    .map((inv) => inv.subtotal)
    .reduce((sum, val) => addDecimals(sum, new Prisma.Decimal(val)), new Prisma.Decimal(0));
  const generatedTax = activeInvoices
    .map((inv) => inv.taxAmount)
    .reduce((sum, val) => addDecimals(sum, new Prisma.Decimal(val)), new Prisma.Decimal(0));

  // IVA descontable: estimación sobre gastos con categoría susceptible de IVA
  const vatableExpenses = periodTransactions.filter(
    (tx) =>
      tx.type === "EXPENSE" &&
      tx.category &&
      IVA_DEDUCTIBLE_CATEGORIES.has(tx.category)
  );
  const deductibleBase = vatableExpenses
    .map((tx) => tx.amount)
    .reduce((sum, val) => addDecimals(sum, new Prisma.Decimal(val)), new Prisma.Decimal(0));
  const deductibleTax = deductibleBase.times(IVA_RATE);

  // ReteFuente sobre ingresos (facturas activas)
  const reteOnIncomeBase = activeInvoices
    .map((inv) => inv.subtotal)
    .reduce((sum, val) => addDecimals(sum, new Prisma.Decimal(val)), new Prisma.Decimal(0));
  const reteOnIncomeRate = getReteFuenteRate(reteOnIncomeBase);
  const reteOnIncomeTax = reteOnIncomeBase.times(reteOnIncomeRate);

  // ReteFuente sobre gastos/servicios (transacciones EXPENSE con monto alto)
  const reteExpenseTransactions = periodTransactions.filter(
    (tx) => tx.type === "EXPENSE" && getReteFuenteRate(new Prisma.Decimal(tx.amount)) > 0
  );
  const reteOnExpensesBase = reteExpenseTransactions
    .map((tx) => tx.amount)
    .reduce((sum, val) => addDecimals(sum, new Prisma.Decimal(val)), new Prisma.Decimal(0));
  const reteOnExpensesRate = reteExpenseTransactions.length > 0 ? getReteFuenteRate(reteOnExpensesBase) : 0;
  const reteOnExpensesTax = reteOnExpensesBase.times(reteOnExpensesRate);

  // ICA
  const city = detectCity(periodInvoices, periodTransactions, options.orgMetadata);
  const icaRate = city ? (ICA_RATES[city] ?? 0.009) : 0;
  const icaBase = generatedBase;
  const icaTax = icaBase.times(icaRate);

  // Summary
  const totalInvoiced = activeInvoices
    .map((inv) => inv.total)
    .reduce((sum, val) => addDecimals(sum, new Prisma.Decimal(val)), new Prisma.Decimal(0));
  const totalIncomeTransactions = periodTransactions
    .filter((tx) => tx.type === "INCOME")
    .map((tx) => tx.amount)
    .reduce((sum, val) => addDecimals(sum, new Prisma.Decimal(val)), new Prisma.Decimal(0));
  const totalExpenseTransactions = periodTransactions
    .filter((tx) => tx.type === "EXPENSE")
    .map((tx) => tx.amount)
    .reduce((sum, val) => addDecimals(sum, new Prisma.Decimal(val)), new Prisma.Decimal(0));

  const report: ColombianTaxReport = {
    period: {
      periodType: filter.periodType,
      year: filter.year,
      month: filter.month,
      bimester: filter.month && filter.periodType === "BIMONTHLY" ? Math.ceil(filter.month / 2) : undefined,
      label: buildPeriodLabel(filter, locale),
    },
    generatedAt: new Date().toISOString(),
    currency,
    disclaimers: [
      tr(
        locale,
        "Este reporte es un borrador orientativo generado automáticamente a partir de la información registrada en Rhynode Finance.",
        "This report is an orientative draft generated automatically from the information recorded in Rhynode Finance."
      ),
      tr(
        locale,
        "La DIAN determina las tarifas, exclusiones y procedimientos definitivos. Revise siempre con un contador o revisor fiscal antes de presentar declaraciones.",
        "The DIAN determines the definitive rates, exclusions, and procedures. Always review with an accountant or statutory auditor before filing declarations."
      ),
      tr(
        locale,
        "El IVA descontable es una estimación basada en categorías de gastos; no reemplaza el soporte de facturas de proveedores.",
        "Deductible VAT is an estimate based on expense categories; it does not replace vendor invoice support."
      ),
    ],
    iva: {
      generated: {
        concept: tr(
          locale,
          "IVA generado (facturas emitidas/pagadas)",
          "VAT generated (issued/paid invoices)"
        ),
        base: decimalToNumber(generatedBase),
        rate: decimalToNumber(IVA_RATE),
        tax: decimalToNumber(generatedTax),
        count: activeInvoices.length,
        note: tr(
          locale,
          "Suma del impuesto registrado en facturas con estado distinto a borrador/anulado.",
          "Sum of tax recorded on invoices with status other than draft/cancelled."
        ),
      },
      deductible: {
        concept: tr(
          locale,
          "IVA descontable estimado (gastos)",
          "Estimated deductible VAT (expenses)"
        ),
        base: decimalToNumber(deductibleBase),
        rate: decimalToNumber(IVA_RATE),
        tax: decimalToNumber(deductibleTax),
        count: vatableExpenses.length,
        note: tr(
          locale,
          "Estimación del 19% sobre gastos categorizados como susceptibles de IVA. Requiere soporte fiscal.",
          "Estimate of 19% on expenses categorized as VAT-eligible. Requires tax support."
        ),
      },
      netPayable: decimalToNumber(generatedTax.minus(deductibleTax)),
    },
    reteFuente: {
      onIncome: {
        concept: tr(
          locale,
          "ReteFuente estimado sobre ingresos",
          "Estimated withholding on income"
        ),
        base: decimalToNumber(reteOnIncomeBase),
        rate: reteOnIncomeRate,
        tax: decimalToNumber(reteOnIncomeTax),
        count: activeInvoices.length,
        note: tr(
          locale,
          "Umbral simplificado aplicado a la base gravable de facturas. Tarifa real según tipo de actividad y acuerdos.",
          "Simplified threshold applied to the invoice taxable base. Actual rate depends on activity type and agreements."
        ),
      },
      onExpenses: {
        concept: tr(
          locale,
          "ReteFuente estimado practicado en pagos",
          "Estimated withholding applied on payments"
        ),
        base: decimalToNumber(reteOnExpensesBase),
        rate: reteOnExpensesRate,
        tax: decimalToNumber(reteOnExpensesTax),
        count: reteExpenseTransactions.length,
        note: tr(
          locale,
          "Estimación de retenciones aplicadas a pagos por servicios según umbrales simplificados.",
          "Estimate of withholdings applied to service payments per simplified thresholds."
        ),
      },
      total: decimalToNumber(reteOnIncomeTax.plus(reteOnExpensesTax)),
      note: tr(
        locale,
        "La retención definitiva depende del tipo de operación, contrato y responsable del impuesto.",
        "The final withholding depends on the operation type, contract, and tax responsible party."
      ),
    },
    ica: {
      city,
      rate: icaRate,
      base: decimalToNumber(icaBase),
      amount: decimalToNumber(icaTax),
      note: city
        ? tr(
            locale,
            `Tarifa ICA aproximada para ${city}. Verifique la tarifa exacta ante el municipio respectivo.`,
            `Approximate ICA rate for ${city}. Verify the exact rate with the respective municipality.`
          )
        : tr(
            locale,
            "No se detectó ciudad. Configure la ciudad de la organización o incluya ubicación en transacciones para calcular ICA.",
            "No city detected. Configure the organization city or include location in transactions to compute ICA."
          ),
    },
    summary: {
      totalInvoiced: decimalToNumber(totalInvoiced),
      totalIncomeTransactions: decimalToNumber(totalIncomeTransactions),
      totalExpenseTransactions: decimalToNumber(totalExpenseTransactions),
    },
  };

  return report;
}

export function generateReportCSV(report: ColombianTaxReport, locale: Locale = "es"): string {
  const headers = [
    tr(locale, "Concepto", "Concept"),
    tr(locale, "Base", "Base"),
    tr(locale, "Tasa", "Rate"),
    tr(locale, "Impuesto", "Tax"),
    tr(locale, "Cantidad", "Count"),
    tr(locale, "Nota", "Note"),
  ];
  const rows = [
    [report.iva.generated.concept, report.iva.generated.base, report.iva.generated.rate, report.iva.generated.tax, report.iva.generated.count, report.iva.generated.note],
    [report.iva.deductible.concept, report.iva.deductible.base, report.iva.deductible.rate, report.iva.deductible.tax, report.iva.deductible.count, report.iva.deductible.note],
    [tr(locale, "IVA neto a pagar", "Net VAT payable"), report.iva.netPayable, "", "", "", ""],
    [report.reteFuente.onIncome.concept, report.reteFuente.onIncome.base, report.reteFuente.onIncome.rate, report.reteFuente.onIncome.tax, report.reteFuente.onIncome.count, report.reteFuente.onIncome.note],
    [report.reteFuente.onExpenses.concept, report.reteFuente.onExpenses.base, report.reteFuente.onExpenses.rate, report.reteFuente.onExpenses.tax, report.reteFuente.onExpenses.count, report.reteFuente.onExpenses.note],
    [tr(locale, "ReteFuente total", "Total withholding"), report.reteFuente.total, "", "", "", report.reteFuente.note],
    [tr(locale, "ICA", "ICA"), report.ica.base, report.ica.rate, report.ica.amount, "", report.ica.note],
  ].map((row) =>
    row
      .map((cell) => {
        const text = String(cell ?? "").replace(/"/g, '""');
        if (/[",\n\r]/.test(text)) return `"${text}"`;
        return text;
      })
      .join(",")
  );

  const meta = [
    `${tr(locale, "Período", "Period")},${report.period.label}`,
    `${tr(locale, "Generado", "Generated")},${formatDate(report.generatedAt, locale, { dateStyle: "medium", timeStyle: "short" })}`,
    `${tr(locale, "Moneda", "Currency")},${report.currency}`,
    "",
    headers.join(","),
    ...rows,
    "",
    tr(locale, "Descargos", "Disclaimers"),
    ...report.disclaimers.map((d) => `"${d.replace(/"/g, '""')}"`),
  ];

  return meta.join("\n");
}

export function generateReportXLSX(report: ColombianTaxReport, locale: Locale = "es"): Buffer {
  const conceptLabel = tr(locale, "Concepto", "Concept");
  const valueLabel = tr(locale, "Valor", "Value");
  const baseLabel = tr(locale, "Base", "Base");
  const rateLabel = tr(locale, "Tasa", "Rate");
  const taxLabel = tr(locale, "Impuesto", "Tax");
  const countLabel = tr(locale, "Cantidad", "Count");

  const summaryRows = [
    { [conceptLabel]: tr(locale, "Período", "Period"), [valueLabel]: report.period.label },
    { [conceptLabel]: tr(locale, "Total facturado", "Total invoiced"), [valueLabel]: formatCOP(report.summary.totalInvoiced, locale) },
    { [conceptLabel]: tr(locale, "Ingresos registrados", "Registered income"), [valueLabel]: formatCOP(report.summary.totalIncomeTransactions, locale) },
    { [conceptLabel]: tr(locale, "Gastos registrados", "Registered expenses"), [valueLabel]: formatCOP(report.summary.totalExpenseTransactions, locale) },
  ];

  const taxRows = [
    { [conceptLabel]: report.iva.generated.concept, [baseLabel]: formatCOP(report.iva.generated.base, locale), [rateLabel]: report.iva.generated.rate, [taxLabel]: formatCOP(report.iva.generated.tax, locale), [countLabel]: report.iva.generated.count },
    { [conceptLabel]: report.iva.deductible.concept, [baseLabel]: formatCOP(report.iva.deductible.base, locale), [rateLabel]: report.iva.deductible.rate, [taxLabel]: formatCOP(report.iva.deductible.tax, locale), [countLabel]: report.iva.deductible.count },
    { [conceptLabel]: tr(locale, "IVA neto a pagar", "Net VAT payable"), [baseLabel]: "", [rateLabel]: "", [taxLabel]: formatCOP(report.iva.netPayable, locale), [countLabel]: "" },
    { [conceptLabel]: report.reteFuente.onIncome.concept, [baseLabel]: formatCOP(report.reteFuente.onIncome.base, locale), [rateLabel]: report.reteFuente.onIncome.rate, [taxLabel]: formatCOP(report.reteFuente.onIncome.tax, locale), [countLabel]: report.reteFuente.onIncome.count },
    { [conceptLabel]: report.reteFuente.onExpenses.concept, [baseLabel]: formatCOP(report.reteFuente.onExpenses.base, locale), [rateLabel]: report.reteFuente.onExpenses.rate, [taxLabel]: formatCOP(report.reteFuente.onExpenses.tax, locale), [countLabel]: report.reteFuente.onExpenses.count },
    { [conceptLabel]: tr(locale, "ReteFuente total", "Total withholding"), [baseLabel]: "", [rateLabel]: "", [taxLabel]: formatCOP(report.reteFuente.total, locale), [countLabel]: "" },
    { [conceptLabel]: tr(locale, "ICA", "ICA"), [baseLabel]: formatCOP(report.ica.base, locale), [rateLabel]: report.ica.rate, [taxLabel]: formatCOP(report.ica.amount, locale), [countLabel]: report.ica.city ?? tr(locale, "Sin ciudad", "No city") },
  ];

  const noteLabel = tr(locale, "Nota", "Note");
  const disclaimerRows = report.disclaimers.map((d) => ({ [noteLabel]: d }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), tr(locale, "Resumen", "Summary"));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(taxRows), tr(locale, "Impuestos", "Taxes"));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(disclaimerRows), tr(locale, "Descargos", "Disclaimers"));

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

export async function generateReportPDF(report: ColombianTaxReport, locale: Locale = "es"): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage();
  const { height } = page.getSize();
  const margin = 40;
  let y = height - margin;

  function drawText(text: string, opts: { x?: number; y?: number; size?: number; bold?: boolean; color?: ReturnType<typeof rgb> }) {
    const size = opts.size ?? 10;
    const f = opts.bold ? fontBold : font;
    page.drawText(text, {
      x: opts.x ?? margin,
      y: opts.y ?? y,
      size,
      font: f,
      color: opts.color ?? rgb(0.2, 0.2, 0.2),
    });
  }

  drawText(
    tr(locale, "Reporte Fiscal Colombia", "Colombia Tax Report"),
    { size: 20, bold: true, color: rgb(0.1, 0.1, 0.1) }
  );
  y -= 24;
  drawText(`${tr(locale, "Período", "Period")}: ${report.period.label}`, { size: 11 });
  y -= 16;
  drawText(
    `${tr(locale, "Generado", "Generated")}: ${formatDate(report.generatedAt, locale, { dateStyle: "medium", timeStyle: "short" })}`,
    { size: 9, color: rgb(0.4, 0.4, 0.4) }
  );
  y -= 28;

  const invoicesWord = tr(locale, "facturas", "invoices");
  const expensesWord = tr(locale, "gastos", "expenses");
  const noCityWord = tr(locale, "Sin ciudad", "No city");

  const sections = [
    {
      title: "IVA",
      lines: [
        [tr(locale, "Generado", "Generated"), formatCOP(report.iva.generated.tax, locale), `${report.iva.generated.count} ${invoicesWord}`],
        [tr(locale, "Descontable estimado", "Estimated deductible"), formatCOP(report.iva.deductible.tax, locale), `${report.iva.deductible.count} ${expensesWord}`],
        [tr(locale, "Neto a pagar", "Net payable"), formatCOP(report.iva.netPayable, locale), ""],
      ],
    },
    {
      title: tr(locale, "ReteFuente", "Withholding"),
      lines: [
        [tr(locale, "Sobre ingresos", "On income"), formatCOP(report.reteFuente.onIncome.tax, locale), `${report.reteFuente.onIncome.count} ${invoicesWord}`],
        [tr(locale, "Practicada en pagos", "Applied on payments"), formatCOP(report.reteFuente.onExpenses.tax, locale), `${report.reteFuente.onExpenses.count} ${expensesWord}`],
        [tr(locale, "Total", "Total"), formatCOP(report.reteFuente.total, locale), ""],
      ],
    },
    {
      title: "ICA",
      lines: [
        [tr(locale, "Base", "Base"), formatCOP(report.ica.base, locale), report.ica.city ?? noCityWord],
        [tr(locale, "Tarifa", "Rate"), `${(report.ica.rate * 1000).toFixed(2)}‰`, ""],
        [tr(locale, "A pagar", "Payable"), formatCOP(report.ica.amount, locale), ""],
      ],
    },
  ];

  for (const section of sections) {
    drawText(section.title, { y, size: 14, bold: true });
    y -= 18;
    for (const [label, value, detail] of section.lines) {
      drawText(label, { x: margin, y, size: 10 });
      drawText(value, { x: margin + 220, y, size: 10, bold: true });
      if (detail) {
        drawText(detail, { x: margin + 360, y, size: 9, color: rgb(0.5, 0.5, 0.5) });
      }
      y -= 14;
    }
    y -= 10;
  }

  y -= 10;
  drawText(tr(locale, "Descargos", "Disclaimers"), { y, size: 12, bold: true });
  y -= 16;
  for (const disclaimer of report.disclaimers) {
    const wrapped = wrapText(disclaimer, 80);
    for (const line of wrapped) {
      drawText(line, { y, size: 8, color: rgb(0.4, 0.4, 0.4) });
      y -= 12;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

function wrapText(text: string, maxLength: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxLength) {
      lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}