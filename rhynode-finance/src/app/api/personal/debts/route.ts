import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  name: z.string().min(1),
  type: z.string().default("OWE"),
  counterparty: z.string().optional(),
  principalAmount: z.number().min(0),
  interestRate: z.number().optional(),
  remainingAmount: z.number().min(0),
  currency: z.string().default("COP"),
  dueDate: z.string().datetime().or(z.string()).optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const debts = await prisma.debt.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ debts });
  } catch (error) {
    logger.error("Failed to fetch debts", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to fetch debts" },
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

    const { name, type, counterparty, principalAmount, interestRate, remainingAmount, currency, dueDate, notes } = parsed.data;

    const debt = await prisma.debt.create({
      data: {
        userId: profile.id,
        name,
        type,
        counterparty,
        principalAmount,
        interestRate,
        remainingAmount,
        currency,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes,
      },
    });

    return NextResponse.json({ debt });
  } catch (error) {
    logger.error("Failed to create debt", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to create debt" },
      { status: 500 }
    );
  }
}