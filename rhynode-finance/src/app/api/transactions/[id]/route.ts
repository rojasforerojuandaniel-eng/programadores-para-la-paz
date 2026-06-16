import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER", "ADJUSTMENT"]).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().min(0).optional(),
  currency: z.enum(["COP", "MXN", "BRL", "USD"]).optional(),
  reference: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const org = await requireAuth();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const transaction = await prisma.transaction.update({
      where: { id, organizationId: org.id },
      data: parsed.data,
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    logger.error("Failed to update transaction", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const org = await requireAuth();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    await prisma.transaction.delete({ where: { id, organizationId: org.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete transaction", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}