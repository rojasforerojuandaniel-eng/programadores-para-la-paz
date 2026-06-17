import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";
import { auditLog } from "@/lib/audit-log";

const updateSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED", "PARTIAL"]).optional(),
  projectId: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

export const PATCH = withRateLimit(async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) {
      data.status = parsed.data.status;
      if (parsed.data.status === "PAID") {
        data.paidAt = new Date();
      }
    }
    if (parsed.data.projectId !== undefined) data.projectId = parsed.data.projectId || null;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
    if (parsed.data.terms !== undefined) data.terms = parsed.data.terms;
    if (parsed.data.dueDate !== undefined) {
      data.dueDate = new Date(parsed.data.dueDate);
    }

    auditLog({
      userId: org.id,
      action: "UPDATE_INVOICE",
      resource: "invoice",
      resourceId: id,
      metadata: data,
    });
    const invoice = await prisma.invoice.update({
      where: { id, organizationId: org.id },
      data,
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    logger.error("Failed to update invoice", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});

export const DELETE = withRateLimit(async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    auditLog({
      userId: org.id,
      action: "DELETE_INVOICE",
      resource: "invoice",
      resourceId: id,
    });
    await prisma.invoice.delete({
      where: { id, organizationId: org.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete invoice", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});