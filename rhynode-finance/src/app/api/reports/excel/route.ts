import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";
import { getLocale } from "@/lib/locale-server";
import { formatDate } from "@/lib/format";

export const GET = withRateLimit(async function GET() {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const locale = await getLocale();

    const transactions = await prisma.transaction.findMany({
      where: { organizationId: org.id },
      orderBy: { date: "asc" },
    });

    const dateLabel = locale === "en" ? "Date" : "Fecha";
    const descLabel = locale === "en" ? "Description" : "Descripción";
    const categoryLabel = locale === "en" ? "Category" : "Categoría";
    const typeLabel = locale === "en" ? "Type" : "Tipo";
    const amountLabel = locale === "en" ? "Amount" : "Monto";
    const notesLabel = locale === "en" ? "Notes" : "Notas";

    const rows = transactions.map((tx) => ({
      [dateLabel]: formatDate(tx.date, locale),
      [descLabel]: tx.description,
      [categoryLabel]: tx.category || "—",
      [typeLabel]: tx.type,
      [amountLabel]: tx.amount,
      [notesLabel]: tx.reference || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      locale === "en" ? "Transactions" : "Transacciones",
    );

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const filename = locale === "en" ? "transactions.xlsx" : "transacciones.xlsx";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error("Excel export error", { error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to generate Excel" }, { status: 500 });
  }
}, {"maxRequests": 10,"windowMs": 60000});