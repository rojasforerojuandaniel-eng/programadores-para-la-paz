import { formatDate as fmtDate } from "@/lib/format";
import type { Locale } from "@/lib/locale";
import {
  type CalculationResult,
  type TFn,
  downloadBlob,
  formatCOP,
  getIcaCityLabel,
} from "@/lib/tax-calculator";

export async function exportTaxPdf(
  result: CalculationResult,
  t: TFn,
  locale: Locale
) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const { height } = page.getSize();
  const margin = 50;
  let y = height - margin;
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  function drawText(
    text: string,
    opts: {
      x?: number;
      y?: number;
      size?: number;
      bold?: boolean;
      color?: ReturnType<typeof rgb>;
    }
  ) {
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

  drawText(t("calculator.pdf.title"), {
    size: 16,
    bold: true,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 24;
  drawText(
    t("calculator.pdf.generated", {
      date: fmtDate(new Date(result.generatedAt), locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    }),
    {
      size: 9,
      color: rgb(0.4, 0.4, 0.4),
    }
  );
  y -= 28;

  const lines: [string, string][] = [
    [t("calculator.regime.taxTypeLabel"), result.taxType],
    [t("calculator.results.baseLabel"), formatCOP(result.base, locale)],
    [t("calculator.pdf.rows.rate"), result.rateLabel],
    [t("calculator.pdf.rows.estimatedTax"), formatCOP(result.tax, locale)],
    [t("exampleColumns.total"), formatCOP(result.total, locale)],
  ];

  if (result.taxType === "IVA" && result.netPayable !== undefined) {
    lines.push([t("rows.ivaNet"), formatCOP(result.netPayable, locale)]);
  }
  if (result.city) {
    lines.push([
      t("calculator.pdf.rows.icaCity"),
      getIcaCityLabel(result.city, t),
    ]);
  }

  for (const [label, value] of lines) {
    drawText(label, { y, size: 10 });
    drawText(value, { x: margin + 240, y, size: 10, bold: true });
    y -= 16;
  }

  y -= 16;
  drawText(t("calculator.pdf.disclaimerHeading"), { y, size: 12, bold: true });
  y -= 16;
  const disclaimer = t("calculator.pdf.disclaimerBody");
  for (const line of wrapText(disclaimer, 75)) {
    drawText(line, { y, size: 9, color: rgb(0.4, 0.4, 0.4) });
    y -= 12;
  }

  const bytes = new Uint8Array(await doc.save());
  downloadBlob(
    new Blob([bytes], { type: "application/pdf" }),
    "calculo-impuestos.pdf"
  );
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
