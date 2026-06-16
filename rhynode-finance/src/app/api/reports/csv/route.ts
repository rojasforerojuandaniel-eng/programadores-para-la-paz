import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

function escapeCsv(value: unknown): string {
  const text = String(value ?? "").replace(/"/g, '""');
  if (/[",\n\r]/.test(text)) {
    return `"${text}"`;
  }
  return text;
}

export async function GET() {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      where: { organizationId: org.id },
      orderBy: { date: "asc" },
    });

    const headers = ["Fecha", "Descripción", "Categoría", "Tipo", "Monto", "Moneda", "Notas"];
    const rows = transactions.map((tx) => [
      new Date(tx.date).toISOString().split("T")[0],
      tx.description,
      tx.category || "—",
      tx.type,
      tx.amount.toString(),
      tx.currency,
      tx.reference || "",
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transacciones.csv"`,
      },
    });
  } catch (error) {
    logger.error("CSV export error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to generate CSV" }, { status: 500 });
  }
}
