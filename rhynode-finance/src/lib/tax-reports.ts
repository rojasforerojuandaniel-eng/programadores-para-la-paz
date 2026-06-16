import { Prisma } from "@/generated/prisma/client";
import type { Invoice, Transaction } from "@/generated/prisma/client";
import { decimalToNumber } from "@/lib/decimal";
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

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getReteFuenteRate(amount: Prisma.Decimal): number {
  const num = decimalToNumber(amount);
  if (num <= 1_000_000) return 0;
  if (num <= 5_000_000) return 0.01;
  if (num <= 10_000_000) return 0.02;
  if (num <= 50_000_000) return 0.03;
  return 0.04;
}

function buildPeriodLabel(filter: TaxPeriodFilter): string {
  if (filter.periodType === "MONTHLY" && filter.month) {
    const date = new Date(filter.year, filter.month - 1, 1);
    return date.toLocaleDateString("es-CO", { year: "numeric", month: "long" });
  }
  if (filter.periodType === "BIMONTHLY" && filter.month) {
    const bimester = Math.ceil(filter.month / 2);
    return `${filter.year} - Bimestre ${bimester}`;
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

export function calculateColombianTaxReport(
  invoices: InvoiceInput[],
  transactions: TransactionInput[],
  filter: TaxPeriodFilter,
  options: { currency?: string; orgMetadata?: Record<string, unknown> | null } = {}
): ColombianTaxReport {
  const currency = options.currency ?? "COP";
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
      label: buildPeriodLabel(filter),
    },
    generatedAt: new Date().toISOString(),
    currency,
    disclaimers: [
      "Este reporte es un borrador orientativo generado automáticamente a partir de la información registrada en Rhynode Finance.",
      "La DIAN determina las tarifas, exclusiones y procedimientos definitivos. Revise siempre con un contador o revisor fiscal antes de presentar declaraciones.",
      "El IVA descontable es una estimación basada en categorías de gastos; no reemplaza el soporte de facturas de proveedores.",
    ],
    iva: {
      generated: {
        concept: "IVA generado (facturas emitidas/pagadas)",
        base: decimalToNumber(generatedBase),
        rate: decimalToNumber(IVA_RATE),
        tax: decimalToNumber(generatedTax),
        count: activeInvoices.length,
        note: "Suma del impuesto registrado en facturas con estado distinto a borrador/anulado.",
      },
      deductible: {
        concept: "IVA descontable estimado (gastos)",
        base: decimalToNumber(deductibleBase),
        rate: decimalToNumber(IVA_RATE),
        tax: decimalToNumber(deductibleTax),
        count: vatableExpenses.length,
        note: "Estimación del 19% sobre gastos categorizados como susceptibles de IVA. Requiere soporte fiscal.",
      },
      netPayable: decimalToNumber(generatedTax.minus(deductibleTax)),
    },
    reteFuente: {
      onIncome: {
        concept: "ReteFuente estimado sobre ingresos",
        base: decimalToNumber(reteOnIncomeBase),
        rate: reteOnIncomeRate,
        tax: decimalToNumber(reteOnIncomeTax),
        count: activeInvoices.length,
        note: "Umbral simplificado aplicado a la base gravable de facturas. Tarifa real según tipo de actividad y acuerdos.",
      },
      onExpenses: {
        concept: "ReteFuente estimado practicado en pagos",
        base: decimalToNumber(reteOnExpensesBase),
        rate: reteOnExpensesRate,
        tax: decimalToNumber(reteOnExpensesTax),
        count: reteExpenseTransactions.length,
        note: "Estimación de retenciones aplicadas a pagos por servicios según umbrales simplificados.",
      },
      total: decimalToNumber(reteOnIncomeTax.plus(reteOnExpensesTax)),
      note: "La retención definitiva depende del tipo de operación, contrato y responsable del impuesto.",
    },
    ica: {
      city,
      rate: icaRate,
      base: decimalToNumber(icaBase),
      amount: decimalToNumber(icaTax),
      note: city
        ? `Tarifa ICA aproximada para ${city}. Verifique la tarifa exacta ante el municipio respectivo.`
        : "No se detectó ciudad. Configure la ciudad de la organización o incluya ubicación en transacciones para calcular ICA.",
    },
    summary: {
      totalInvoiced: decimalToNumber(totalInvoiced),
      totalIncomeTransactions: decimalToNumber(totalIncomeTransactions),
      totalExpenseTransactions: decimalToNumber(totalExpenseTransactions),
    },
  };

  return report;
}

export function generateReportCSV(report: ColombianTaxReport): string {
  const headers = ["Concepto", "Base", "Tasa", "Impuesto", "Cantidad", "Nota"];
  const rows = [
    [report.iva.generated.concept, report.iva.generated.base, report.iva.generated.rate, report.iva.generated.tax, report.iva.generated.count, report.iva.generated.note],
    [report.iva.deductible.concept, report.iva.deductible.base, report.iva.deductible.rate, report.iva.deductible.tax, report.iva.deductible.count, report.iva.deductible.note],
    ["IVA neto a pagar", report.iva.netPayable, "", "", "", ""],
    [report.reteFuente.onIncome.concept, report.reteFuente.onIncome.base, report.reteFuente.onIncome.rate, report.reteFuente.onIncome.tax, report.reteFuente.onIncome.count, report.reteFuente.onIncome.note],
    [report.reteFuente.onExpenses.concept, report.reteFuente.onExpenses.base, report.reteFuente.onExpenses.rate, report.reteFuente.onExpenses.tax, report.reteFuente.onExpenses.count, report.reteFuente.onExpenses.note],
    ["ReteFuente total", report.reteFuente.total, "", "", "", report.reteFuente.note],
    ["ICA", report.ica.base, report.ica.rate, report.ica.amount, "", report.ica.note],
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
    `Período,${report.period.label}`,
    `Generado,${new Date(report.generatedAt).toLocaleString("es-CO")}`,
    `Moneda,${report.currency}`,
    "",
    headers.join(","),
    ...rows,
    "",
    "Descargos",
    ...report.disclaimers.map((d) => `"${d.replace(/"/g, '""')}"`),
  ];

  return meta.join("\n");
}

export function generateReportXLSX(report: ColombianTaxReport): Buffer {
  const summaryRows = [
    { Concepto: "Período", Valor: report.period.label },
    { Concepto: "Total facturado", Valor: formatCOP(report.summary.totalInvoiced) },
    { Concepto: "Ingresos registrados", Valor: formatCOP(report.summary.totalIncomeTransactions) },
    { Concepto: "Gastos registrados", Valor: formatCOP(report.summary.totalExpenseTransactions) },
  ];

  const taxRows = [
    { Concepto: report.iva.generated.concept, Base: formatCOP(report.iva.generated.base), Tasa: report.iva.generated.rate, Impuesto: formatCOP(report.iva.generated.tax), Cantidad: report.iva.generated.count },
    { Concepto: report.iva.deductible.concept, Base: formatCOP(report.iva.deductible.base), Tasa: report.iva.deductible.rate, Impuesto: formatCOP(report.iva.deductible.tax), Cantidad: report.iva.deductible.count },
    { Concepto: "IVA neto a pagar", Base: "", Tasa: "", Impuesto: formatCOP(report.iva.netPayable), Cantidad: "" },
    { Concepto: report.reteFuente.onIncome.concept, Base: formatCOP(report.reteFuente.onIncome.base), Tasa: report.reteFuente.onIncome.rate, Impuesto: formatCOP(report.reteFuente.onIncome.tax), Cantidad: report.reteFuente.onIncome.count },
    { Concepto: report.reteFuente.onExpenses.concept, Base: formatCOP(report.reteFuente.onExpenses.base), Tasa: report.reteFuente.onExpenses.rate, Impuesto: formatCOP(report.reteFuente.onExpenses.tax), Cantidad: report.reteFuente.onExpenses.count },
    { Concepto: "ReteFuente total", Base: "", Tasa: "", Impuesto: formatCOP(report.reteFuente.total), Cantidad: "" },
    { Concepto: "ICA", Base: formatCOP(report.ica.base), Tasa: report.ica.rate, Impuesto: formatCOP(report.ica.amount), Cantidad: report.ica.city ?? "Sin ciudad" },
  ];

  const disclaimerRows = report.disclaimers.map((d) => ({ Nota: d }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Resumen");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(taxRows), "Impuestos");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(disclaimerRows), "Descargos");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

export async function generateReportPDF(report: ColombianTaxReport): Promise<Uint8Array> {
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

  drawText("Reporte Fiscal Colombia", { size: 20, bold: true, color: rgb(0.1, 0.1, 0.1) });
  y -= 24;
  drawText(`Período: ${report.period.label}`, { size: 11 });
  y -= 16;
  drawText(`Generado: ${new Date(report.generatedAt).toLocaleString("es-CO")}`, { size: 9, color: rgb(0.4, 0.4, 0.4) });
  y -= 28;

  const sections = [
    {
      title: "IVA",
      lines: [
        ["Generado", formatCOP(report.iva.generated.tax), `${report.iva.generated.count} facturas`],
        ["Descontable estimado", formatCOP(report.iva.deductible.tax), `${report.iva.deductible.count} gastos`],
        ["Neto a pagar", formatCOP(report.iva.netPayable), ""],
      ],
    },
    {
      title: "ReteFuente",
      lines: [
        ["Sobre ingresos", formatCOP(report.reteFuente.onIncome.tax), `${report.reteFuente.onIncome.count} facturas`],
        ["Practicada en pagos", formatCOP(report.reteFuente.onExpenses.tax), `${report.reteFuente.onExpenses.count} gastos`],
        ["Total", formatCOP(report.reteFuente.total), ""],
      ],
    },
    {
      title: "ICA",
      lines: [
        ["Base", formatCOP(report.ica.base), report.ica.city ?? "Sin ciudad"],
        ["Tarifa", `${(report.ica.rate * 1000).toFixed(2)}‰`, ""],
        ["A pagar", formatCOP(report.ica.amount), ""],
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
  drawText("Descargos", { y, size: 12, bold: true });
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
