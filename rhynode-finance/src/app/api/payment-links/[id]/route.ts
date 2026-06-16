import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  amount: z.number().min(0).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function PATCH(
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
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.amount !== undefined) data.amount = parsed.data.amount;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.expiresAt !== undefined) {
      data.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
    }

    const link = await prisma.paymentLink.update({
      where: { id, organizationId: org.id },
      data,
    });

    return NextResponse.json({ link });
  } catch (error) {
    console.error("Failed to update payment link:", error);
    return NextResponse.json(
      { error: "Failed to update payment link" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    await prisma.paymentLink.delete({
      where: { id, organizationId: org.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete payment link:", error);
    return NextResponse.json(
      { error: "Failed to delete payment link" },
      { status: 500 }
    );
  }
}
