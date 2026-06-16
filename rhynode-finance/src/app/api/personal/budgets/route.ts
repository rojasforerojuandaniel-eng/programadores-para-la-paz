import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  amount: z.number().min(0),
  period: z.string().default("MONTHLY"),
  startDate: z.string().datetime().or(z.string()),
  endDate: z.string().datetime().or(z.string()).optional(),
  categoryId: z.string().optional(),
  rollover: z.boolean().default(false),
});

export async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const budgets = await prisma.budget.findMany({
      where: { userId: profile.id },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ budgets });
  } catch (error) {
    console.error("Failed to fetch budgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch budgets" },
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

    const { name, amount, period, startDate, endDate, categoryId, rollover } = parsed.data;

    const budget = await prisma.budget.create({
      data: {
        userId: profile.id,
        name,
        amount,
        period,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        categoryId,
        rollover,
      },
    });

    return NextResponse.json({ budget });
  } catch (error) {
    console.error("Failed to create budget:", error);
    return NextResponse.json(
      { error: "Failed to create budget" },
      { status: 500 }
    );
  }
}
