import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";

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

export async function GET() {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const links = await prisma.paymentLink.findMany({
      where: { organizationId: org.id },
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
}

export async function POST(request: Request) {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        organizationId: org.id,
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
}