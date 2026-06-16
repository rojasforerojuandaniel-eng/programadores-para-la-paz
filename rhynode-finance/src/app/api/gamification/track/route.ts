import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/auth";
import { addXp } from "@/lib/gamification";
import { updateStreak } from "@/lib/streak";
import { getPrisma } from "@/lib/prisma";
import { z } from "zod";
import { logger } from "@/lib/logger";

const trackSchema = z.object({
  action: z.enum([
    "CREATE_TRANSACTION",
    "CREATE_ACCOUNT",
    "CREATE_BUDGET",
    "CREATE_GOAL",
    "COMPLETE_GOAL",
    "CREATE_INVOICE",
    "PAY_INVOICE",
    "FIRST_RECEIPT",
    "BUDGET_ON_TRACK",
  ]),
});

export async function POST(request: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid action", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const streakResult = await updateStreak(profile.id);
    const xpResult = await addXp(profile.id, parsed.data.action);

    return NextResponse.json({
      streak: streakResult,
      xp: xpResult,
    });
  } catch (error) {
    logger.error("Gamification track error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();
    const activities = await prisma.userActivity.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      profile: {
        id: profile.id,
        level: profile.level,
        xp: profile.xp,
        streakDays: profile.streakDays,
      },
      activities,
    });
  } catch (error) {
    logger.error("Gamification get error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}