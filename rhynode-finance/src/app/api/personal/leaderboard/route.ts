import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const topUsers = await prisma.userProfile.findMany({
      orderBy: { xp: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        level: true,
        xp: true,
        title: true,
      },
    });

    const leaderboard = topUsers.map((u, index) => ({
      rank: index + 1,
      name: u.name ?? "Usuario",
      level: u.level,
      xp: u.xp,
      title: u.title ?? null,
    }));

    const myRankIndex = topUsers.findIndex((u) => u.id === profile.id);
    let myRank = myRankIndex !== -1 ? myRankIndex + 1 : null;

    if (myRank === null) {
      const higherXpCount = await prisma.userProfile.count({
        where: { xp: { gt: profile.xp } },
      });
      myRank = higherXpCount + 1;
    }

    return NextResponse.json({ leaderboard, myRank });
  } catch (error) {
    logger.error("Failed to fetch leaderboard", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}