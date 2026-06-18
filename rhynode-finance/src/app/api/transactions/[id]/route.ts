import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";
import { auditLog } from "@/lib/audit-log";
import { learnCategoryFromCorrection } from "@/lib/rules-store";

const updateSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER", "ADJUSTMENT"]).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().min(0).optional(),
  currency: z.enum(["COP", "MXN", "BRL", "USD"]).optional(),
  reference: z.string().optional(),
});

export const PATCH = withRateLimit(async function PATCH(
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

    auditLog({
      userId: org.id,
      action: "UPDATE_TRANSACTION",
      resource: "transaction",
      resourceId: id,
      metadata: parsed.data,
    });
    const transaction = await prisma.transaction.update({
      where: { id, organizationId: org.id },
      data: parsed.data,
    });

    // Categorization learning: if the user corrected the category, persist a
    // rule so future transactions with the same description auto-categorize.
    if (parsed.data.category && transaction.userId && transaction.description) {
      await learnCategoryFromCorrection(
        transaction.userId,
        transaction.description,
        parsed.data.category
      ).catch((error) => {
        logger.error("Failed to learn category rule", { error: error instanceof Error ? error.message : String(error) });
      });
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    logger.error("Failed to update transaction", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}, {"maxRequests": 60,"windowMs": 60000});

export const DELETE = withRateLimit(async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const org = await requireAuth();
    if (!org) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    auditLog({
      userId: org.id,
      action: "DELETE_TRANSACTION",
      resource: "transaction",
      resourceId: id,
    });
    await prisma.transaction.delete({ where: { id, organizationId: org.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete transaction", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}, {"maxRequests": 60,"windowMs": 60000});