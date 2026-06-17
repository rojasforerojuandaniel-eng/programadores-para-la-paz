import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";

const deleteSchema = z.object({
  budgetId: z.string().min(1),
  userId: z.string().min(1),
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

export const GET = withRateLimit(async function GET(request: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const budgetId = searchParams.get("budgetId");

    if (!budgetId) {
      return NextResponse.json(
        { error: "budgetId is required" },
        { status: 400 }
      );
    }

    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    const metadata = (budget.metadata ?? {}) as BudgetMetadata;
    const members = metadata.members ?? [
      { userId: budget.userId, role: "OWNER" as const, joinedAt: budget.createdAt.toISOString() },
    ];

    const isMember = members.some((m) => m.userId === profile.id);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.userProfile.findMany({
      where: {
        id: { in: members.map((m) => m.userId) },
      },
      select: { id: true, name: true, email: true, avatar: true },
    });

    const enrichedMembers = members.map((m) => {
      const user = users.find((u) => u.id === m.userId);
      return {
        ...m,
        name: user?.name ?? null,
        email: user?.email ?? null,
        avatar: user?.avatar ?? null,
      };
    });

    return NextResponse.json({ members: enrichedMembers });
  } catch (error) {
    logger.error("Failed to fetch members", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});

export const DELETE = withRateLimit(async function DELETE(request: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { budgetId, userId } = parsed.data;

    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    const metadata = (budget.metadata ?? {}) as BudgetMetadata;
    const members = metadata.members ?? [
      { userId: budget.userId, role: "OWNER" as const, joinedAt: budget.createdAt.toISOString() },
    ];

    const isOwner = members.some(
      (m) => m.userId === profile.id && m.role === "OWNER"
    );
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedMembers = members.filter((m) => m.userId !== userId);

    await prisma.budget.update({
      where: { id: budgetId },
      data: {
        metadata: JSON.parse(JSON.stringify({
          ...metadata,
          members: updatedMembers,
        })),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to remove member", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});