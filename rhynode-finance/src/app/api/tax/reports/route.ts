import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { logger } from "@/lib/logger";
import { getLocale } from "@/lib/locale-server";
import {
  calculateColombianTaxReport,
  generateReportCSV,
  generateReportXLSX,
  generateReportPDF,
  type TaxPeriodType,
} from "@/lib/tax-reports";

const querySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
  periodType: z.enum(["MONTHLY", "BIMONTHLY"]).default("MONTHLY"),
  format: z.enum(["json", "csv", "xlsx", "pdf"]).default("json"),
});

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_");
}

export const GET = withRateLimit(
  async (request: Request) => {
    try {
      const org = await requireAuth();
      if (!org) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const parsed = querySchema.safeParse({
        year: searchParams.get("year"),
        month: searchParams.get("month"),
        periodType: searchParams.get("periodType"),
        format: searchParams.get("format"),
      });

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { year, month, periodType, format } = parsed.data;
      const effectiveMonth = month ?? new Date().getMonth() + 1;
      const locale = await getLocale();

      const [invoices, transactions] = await Promise.all([
        prisma.invoice.findMany({
          where: { organizationId: org.id },
          include: { client: { select: { city: true } } },
          orderBy: { issueDate: "asc" },
        }),
        prisma.transaction.findMany({
          where: { organizationId: org.id },
          orderBy: { date: "asc" },
        }),
      ]);

      const report = calculateColombianTaxReport(
        invoices,
        transactions,
        { year, month: effectiveMonth, periodType: periodType as TaxPeriodType },
        { currency: org.currency, orgMetadata: org.metadata as Record<string, unknown> | null, locale }
      );

      const baseFilename = sanitizeFilename(`reporte_fiscal_${report.period.label}`);

      if (format === "json") {
        return NextResponse.json(report);
      }

      if (format === "csv") {
        const csv = generateReportCSV(report, locale);
        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${baseFilename}.csv"`,
          },
        });
      }

      if (format === "xlsx") {
        const buffer = generateReportXLSX(report, locale);
        return new NextResponse(Buffer.from(buffer), {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${baseFilename}.xlsx"`,
          },
        });
      }

      // format === "pdf"
      const pdfBytes = await generateReportPDF(report, locale);
      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${baseFilename}.pdf"`,
        },
      });
    } catch (error) {
      logger.error("Tax report export error", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to generate tax report" },
        { status: 500 }
      );
    }
  },
  { key: "tax-reports", maxRequests: 30, windowMs: 60000 }
);
