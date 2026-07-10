import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrganization } from "@/lib/organization.server";
import { canEdit, canView } from "@/lib/organization";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";
import { auditLog } from "@/lib/audit-log";

const createSchema = z.object({
  name: z.string().min(1),
  bankName: z.string().min(1),
  accountNumber: z.string().optional(),
  type: z.enum(["CHECKING", "SAVINGS", "CREDIT", "VIRTUAL"]).optional(),
  currency: z.enum(["COP", "MXN", "BRL", "USD"]).optional(),
  balance: z.number().optional(),
});

export const GET = withRateLimit(async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCurrentOrganization(clerkUserId);
    if (!ctx || !canView(ctx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const accounts = await prisma.bankAccount.findMany({
      where: { organizationId: ctx.org.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    logger.error("Failed to fetch bank accounts", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to fetch bank accounts" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});

export const POST = withRateLimit(async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCurrentOrganization(clerkUserId);
    if (!ctx || !canEdit(ctx.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    auditLog({
      userId: ctx.org.id,
      action: "CREATE_BANK_ACCOUNT",
      resource: "bankAccount",
      metadata: {
        name: parsed.data.name,
        bankName: parsed.data.bankName,
        type: parsed.data.type,
        currency: parsed.data.currency,
      },
    });
    const account = await prisma.bankAccount.create({
      data: {
        organizationId: ctx.org.id,
        ...parsed.data,
        type: parsed.data.type || "CHECKING",
        currency: parsed.data.currency || "COP",
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    logger.error("Failed to create bank account", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to create bank account" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});