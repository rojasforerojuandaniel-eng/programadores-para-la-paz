import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";
import { auditLog } from "@/lib/audit-log";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber: () => number }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}

export const POST = withRateLimit(async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.invoice.findUnique({
      where: { id, organizationId: org.id },
      include: { client: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (existing.status === "PAID") {
      return NextResponse.json(
        { error: "Invoice is already paid" },
        { status: 400 }
      );
    }

    const paidAt = new Date();
    const description = `Pago factura ${existing.number}${
      existing.client?.name ? ` - ${existing.client.name}` : ""
    }`;

    auditLog({
      userId: org.id,
      action: "MARK_INVOICE_PAID",
      resource: "invoice",
      resourceId: id,
      metadata: { number: existing.number, total: toNumber(existing.total) },
    });
    const [invoice, transaction] = await prisma.$transaction([
      prisma.invoice.update({
        where: { id },
        data: { status: "PAID", paidAt },
      }),
      prisma.transaction.create({
        data: {
          organizationId: org.id,
          type: "INCOME",
          category: "Ventas",
          description,
          amount: toNumber(existing.total),
          currency: existing.currency,
          date: paidAt,
          reference: existing.number,
          invoiceId: existing.id,
          scope: "BUSINESS",
        },
      }),
    ]);

    logger.info("Invoice marked as paid", {
      invoiceId: id,
      number: existing.number,
      transactionId: transaction.id,
    });

    return NextResponse.json({ invoice, transaction });
  } catch (error) {
    logger.error("Failed to mark invoice as paid", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to mark invoice as paid" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});
