import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { ACHIEVEMENTS } from "@/lib/achievements";

export async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const unlocked = await prisma.achievement.findMany({
      where: { userId: profile.id },
      orderBy: { unlockedAt: "desc" },
    });

    const unlockedTypes = new Set(unlocked.map((a) => a.type));

    const pending = ACHIEVEMENTS.filter((def) => !unlockedTypes.has(def.type)).map(
      (def) => ({
        type: def.type,
        name: def.name,
        description: def.description,
        icon: def.icon,
        xpAwarded: def.xpAwarded,
        category: def.category,
      })
    );

    const total = ACHIEVEMENTS.length;
    const unlockedCount = unlocked.length;
    const xpEarned = unlocked.reduce((sum, a) => sum + a.xpAwarded, 0);

    return NextResponse.json({
      unlocked,
      pending,
      stats: {
        total,
        unlocked: unlockedCount,
        xpEarned,
      },
    });
  } catch (error) {
    console.error("Failed to fetch achievements:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}
