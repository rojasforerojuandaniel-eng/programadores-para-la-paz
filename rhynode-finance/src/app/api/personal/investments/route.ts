import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  name: z.string().min(1),
  investmentType: z.string().default("STOCK"),
  balance: z.number().min(0),
  investedAmount: z.number().min(0).optional(),
  currency: z.string().default("COP"),
  provider: z.string().optional(),
  externalId: z.string().optional(),
});

export async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const investments = await prisma.investment.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ investments });
  } catch (error) {
    logger.error("Failed to fetch investments", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to fetch investments" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
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

    const {
      name,
      investmentType,
      balance,
      investedAmount,
      currency,
      provider,
      externalId,
    } = parsed.data;

    const investment = await prisma.investment.create({
      data: {
        userId: profile.id,
        name,
        investmentType,
        balance,
        investedAmount: investedAmount ?? 0,
        currency,
        provider,
        externalId,
      },
    });

    return NextResponse.json({ investment });
  } catch (error) {
    logger.error("Failed to create investment", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to create investment" },
      { status: 500 }
    );
  }
}