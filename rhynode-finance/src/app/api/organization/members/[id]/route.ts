import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { normalizeRole, canAdmin } from "@/lib/organization";
import { getCurrentOrganization } from "@/lib/organization.server";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "VIEWER"]),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCurrentOrganization(userId);
    if (!ctx || !canAdmin(ctx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const prisma = getPrisma();
    const member = await prisma.organizationMember.findFirst({
      where: { id, organizationId: ctx.org.id },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (member.userId === userId) {
      return NextResponse.json(
        { error: "No puedes cambiar tu propio rol" },
        { status: 403 }
      );
    }

    const updated = await prisma.organizationMember.update({
      where: { id },
      data: { role: parsed.data.role },
    });

    return NextResponse.json({
      member: {
        id: updated.id,
        userId: updated.userId,
        role: normalizeRole(updated.role),
        status: updated.joinedAt ? "ACTIVE" : "PENDING",
      },
    });
  } catch (error) {
    logger.error("Failed to update member", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCurrentOrganization(userId);
    if (!ctx || !canAdmin(ctx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const prisma = getPrisma();
    const member = await prisma.organizationMember.findFirst({
      where: { id, organizationId: ctx.org.id },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (member.userId === userId) {
      return NextResponse.json(
        { error: "No puedes eliminarte a ti mismo" },
        { status: 403 }
      );
    }

    await prisma.organizationMember.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to remove member", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
