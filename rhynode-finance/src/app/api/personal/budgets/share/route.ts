import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { z } from "zod";
import { randomBytes } from "crypto";
import { logger } from "@/lib/logger";

const postSchema = z.object({
  budgetId: z.string().min(1),
  email: z.string().email(),
});

interface BudgetMember {
  userId: string;
  role: "OWNER" | "MEMBER";
  joinedAt: string;
}

interface BudgetMetadata {
  members?: BudgetMember[];
  inviteCode?: string;
  inviteEmail?: string;
}

function generateInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function POST(request: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { budgetId, email } = parsed.data;

    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    if (budget.userId !== profile.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const metadata = (budget.metadata ?? {}) as BudgetMetadata;
    const inviteCode = generateInviteCode();

    const updatedMetadata: BudgetMetadata = {
      ...metadata,
      members: metadata.members ?? [
        { userId: budget.userId, role: "OWNER", joinedAt: budget.createdAt.toISOString() },
      ],
      inviteCode,
      inviteEmail: email,
    };

    await prisma.budget.update({
      where: { id: budgetId },
      data: { metadata: JSON.parse(JSON.stringify(updatedMetadata)) },
    });

    return NextResponse.json({ inviteCode });
  } catch (error) {
    logger.error("Failed to share budget", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to share budget" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const budgets = await prisma.budget.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    const sharedBudgets = budgets.filter((budget) => {
      const metadata = (budget.metadata ?? {}) as BudgetMetadata;
      const members = metadata.members ?? [];
      return members.some(
        (m) => m.userId === profile.id && m.role === "MEMBER"
      );
    });

    return NextResponse.json({ budgets: sharedBudgets });
  } catch (error) {
    logger.error("Failed to fetch shared budgets", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to fetch shared budgets" },
      { status: 500 }
    );
  }
}