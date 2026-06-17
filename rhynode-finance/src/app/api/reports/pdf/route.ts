import { decimalToNumber } from "@/lib/decimal";
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";

export const GET = withRateLimit(async function GET() {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      where: { organizationId: org.id },
      orderBy: { date: "asc" },
    });

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const margin = 40;
    let y = height - margin;

    // Header
    page.drawText("Reporte de Transacciones", {
      x: margin,
      y,
      size: 20,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 24;

    page.drawText(`Generado: ${new Date().toLocaleDateString("es-CO")}`, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 30;

    if (transactions.length === 0) {
      page.drawText("No hay transacciones registradas.", {
        x: margin,
        y,
        size: 12,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    } else {
      // Table header
      const colX = {
        date: margin,
        desc: margin + 70,
        category: margin + 260,
        amount: margin + 380,
        balance: margin + 460,
      };
      const rowHeight = 16;

      // Header background
      page.drawRectangle({
        x: margin - 4,
        y: y - rowHeight + 2,
        width: width - margin * 2 + 8,
        height: rowHeight,
        color: rgb(0.95, 0.95, 0.95),
      });

      page.drawText("Fecha", { x: colX.date, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      page.drawText("Descripción", { x: colX.desc, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      page.drawText("Categoría", { x: colX.category, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      page.drawText("Monto", { x: colX.amount, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      page.drawText("Balance", { x: colX.balance, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });

      y -= rowHeight;

      let runningBalance = 0;

      for (const tx of transactions) {
        // Add new page if needed
        if (y < margin + 20) {
          const newPage = pdfDoc.addPage();
          y = newPage.getSize().height - margin;
        }

        const amountNum = decimalToNumber(tx.amount);
        const delta = tx.type === "INCOME" || tx.type === "ADJUSTMENT" ? amountNum : -amountNum;
        runningBalance += delta;

        const dateStr = new Date(tx.date).toLocaleDateString("es-CO");
        const amountStr = `${tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "-" : ""}${amountNum.toLocaleString("es-CO")}`;
        const balanceStr = runningBalance.toLocaleString("es-CO");

        page.drawText(dateStr, { x: colX.date, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(tx.description.slice(0, 30), { x: colX.desc, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(tx.category || "—", { x: colX.category, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(amountStr, { x: colX.amount, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText(balanceStr, { x: colX.balance, y, size: 9, font, color: rgb(0.2, 0.2, 0.2) });

        y -= rowHeight;
      }
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="transacciones.pdf"`,
      },
    });
  } catch (error) {
    logger.error("PDF export error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}, {"maxRequests": 10,"windowMs": 60000});