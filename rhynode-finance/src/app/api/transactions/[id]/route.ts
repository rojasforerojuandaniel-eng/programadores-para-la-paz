import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { canEdit } from "@/lib/organization";
import { getCurrentOrganization } from "@/lib/organization.server";
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
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCurrentOrganization(clerkUserId);
    if (!ctx || !canEdit(ctx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const existing = await getPrisma().transaction.findUnique({
      where: { id, organizationId: ctx.org.id },
      select: { scope: true, userId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (existing.scope === "PERSONAL" && existing.userId !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    auditLog({
      userId: profile.id,
      action: "UPDATE_TRANSACTION",
      resource: "transaction",
      resourceId: id,
      metadata: parsed.data,
    });

    const transaction = await getPrisma().transaction.update({
      where: { id, organizationId: ctx.org.id, scope: existing.scope, ...(existing.scope === "PERSONAL" ? { userId: profile.id } : {}) },
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
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCurrentOrganization(clerkUserId);
    if (!ctx || !canEdit(ctx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await getPrisma().transaction.findUnique({
      where: { id, organizationId: ctx.org.id },
      select: { scope: true, userId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (existing.scope === "PERSONAL" && existing.userId !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    auditLog({
      userId: profile.id,
      action: "DELETE_TRANSACTION",
      resource: "transaction",
      resourceId: id,
    });

    await getPrisma().transaction.delete({
      where: { id, organizationId: ctx.org.id, scope: existing.scope, ...(existing.scope === "PERSONAL" ? { userId: profile.id } : {}) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete transaction", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}, {"maxRequests": 60,"windowMs": 60000});