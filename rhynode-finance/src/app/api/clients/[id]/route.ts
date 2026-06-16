import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  taxId: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.enum(["CO", "MX", "BR", "AR", "CL", "PE"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
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

    const client = await prisma.client.update({
      where: { id, organizationId: org.id },
      data: parsed.data,
    });

    return NextResponse.json({ client });
  } catch (error) {
    logger.error("Failed to update client", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
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

    await prisma.client.delete({ where: { id, organizationId: org.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete client", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}