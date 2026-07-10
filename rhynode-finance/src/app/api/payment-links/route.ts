import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrganization } from "@/lib/organization.server";
import { canEdit, canView } from "@/lib/organization";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().min(0),
  currency: z
    .enum(["COP", "MXN", "BRL", "USD", "ARS", "CLP", "PEN"])
    .optional(),
  urlSlug: z.string().min(1),
  maxPayments: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
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

    const links = await prisma.paymentLink.findMany({
      where: { organizationId: ctx.org.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ links });
  } catch (error) {
    logger.error("Failed to fetch payment links", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to fetch payment links" },
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

    const link = await prisma.paymentLink.create({
      data: {
        organizationId: ctx.org.id,
        ...parsed.data,
        currency: parsed.data.currency || "COP",
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      },
    });

    return NextResponse.json({ link });
  } catch (error) {
    logger.error("Failed to create payment link", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to create payment link" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});