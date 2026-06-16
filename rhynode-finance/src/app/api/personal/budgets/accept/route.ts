import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";

const postSchema = z.object({
  inviteCode: z.string().min(1),
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

    const { inviteCode } = parsed.data;

    const budget = await prisma.budget.findFirst({
      where: {
        metadata: {
          path: ["inviteCode"],
          equals: inviteCode,
        },
      },
    });

    if (!budget) {
      return NextResponse.json(
        { error: "Invalid invite code" },
        { status: 404 }
      );
    }

    const metadata = (budget.metadata ?? {}) as BudgetMetadata;
    const members = metadata.members ?? [
      { userId: budget.userId, role: "OWNER" as const, joinedAt: budget.createdAt.toISOString() },
    ];

    if (members.some((m) => m.userId === profile.id)) {
      return NextResponse.json(
        { error: "Already a member" },
        { status: 409 }
      );
    }

    const updatedMembers: BudgetMember[] = [
      ...members,
      { userId: profile.id, role: "MEMBER", joinedAt: new Date().toISOString() },
    ];

    await prisma.budget.update({
      where: { id: budget.id },
      data: {
        metadata: JSON.parse(JSON.stringify({
          ...metadata,
          members: updatedMembers,
          inviteCode: undefined,
          inviteEmail: undefined,
        })),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to accept invite", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    );
  }
}