import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPrisma } from "@/lib/prisma";
import { normalizeRole, canAdmin } from "@/lib/organization";
import { getCurrentOrganization } from "@/lib/organization.server";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = withRateLimit(async function POST(_request: Request, context: RouteContext) {
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

    const updated = await prisma.organizationMember.update({
      where: { id },
      data: { invitedAt: new Date() },
    });

    return NextResponse.json({
      member: {
        id: updated.id,
        userId: updated.userId,
        role: normalizeRole(updated.role),
        status: updated.joinedAt ? "ACTIVE" : "PENDING",
        invitedAt: updated.invitedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error("Failed to resend invitation", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to resend invitation" }, { status: 500 });
  }
}, {"maxRequests": 60,"windowMs": 60000});
