import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

export async function POST(
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
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const previousConfig =
      existing.config && typeof existing.config === "object"
        ? (existing.config as Record<string, unknown>)
        : {};

    const sentAt = new Date().toISOString();
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: "SENT",
        config: {
          ...previousConfig,
          sentAt,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    logger.info("Invoice sent (email simulated)", {
      invoiceId: id,
      number: existing.number,
      sentAt,
    });

    return NextResponse.json({ invoice, sentAt });
  } catch (error) {
    logger.error("Failed to send invoice", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to send invoice" },
      { status: 500 }
    );
  }
}
