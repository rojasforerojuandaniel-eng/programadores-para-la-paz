import { NextRequest, NextResponse } from "next/server";
import { startOfMonth, startOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") ?? "all";
    const validPeriod = ["week", "month", "all"].includes(period)
      ? (period as "week" | "month" | "all")
      : "all";

    const now = new Date();
    const periodStart =
      validPeriod === "week"
        ? startOfWeek(now, { weekStartsOn: 1 })
        : validPeriod === "month"
          ? startOfMonth(now)
          : null;

    let entries: {
      id: string;
      rank: number;
      name: string;
      level: number;
      xp: number;
      title: string | null;
      streakDays: number;
    }[] = [];

    if (validPeriod === "all") {
      const topUsers = await prisma.userProfile.findMany({
        orderBy: { xp: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          level: true,
          xp: true,
          title: true,
          streakDays: true,
        },
      });

      entries = topUsers.map((u, index) => ({
        id: u.id,
        rank: index + 1,
        name: u.name ?? "Usuario",
        level: u.level,
        xp: u.xp,
        title: u.title ?? null,
        streakDays: u.streakDays,
      }));
    } else {
      const activityAggregation = await prisma.userActivity.groupBy({
        by: ["userId"],
        where: periodStart ? { createdAt: { gte: periodStart } } : undefined,
        _sum: { xpEarned: true },
        orderBy: { _sum: { xpEarned: "desc" } },
        take: 20,
      });

      const userIds = activityAggregation.map((a) => a.userId);
      const profiles =
        userIds.length > 0
          ? await prisma.userProfile.findMany({
              where: { id: { in: userIds } },
              select: {
                id: true,
                name: true,
                level: true,
                title: true,
                streakDays: true,
              },
            })
          : [];

      const profileMap = new Map(profiles.map((p) => [p.id, p]));

      entries = activityAggregation.map((a, index) => {
        const user = profileMap.get(a.userId);
        return {
          id: a.userId,
          rank: index + 1,
          name: user?.name ?? "Usuario",
          level: user?.level ?? 1,
          xp: a._sum.xpEarned ?? 0,
          title: user?.title ?? null,
          streakDays: user?.streakDays ?? 0,
        };
      });
    }

    let myRank:
      | {
          id: string;
          rank: number;
          name: string;
          level: number;
          xp: number;
          title: string | null;
          streakDays: number;
        }
      | undefined;

    if (validPeriod === "all") {
      const higherXpCount = await prisma.userProfile.count({
        where: { xp: { gt: profile.xp } },
      });
      myRank = {
        id: profile.id,
        rank: higherXpCount + 1,
        name: profile.name ?? "Usuario",
        level: profile.level,
        xp: profile.xp,
        title: profile.title ?? null,
        streakDays: profile.streakDays,
      };
    } else {
      const myActivity = await prisma.userActivity.aggregate({
        where: {
          userId: profile.id,
          createdAt: periodStart ? { gte: periodStart } : undefined,
        },
        _sum: { xpEarned: true },
      });
      const myXp = myActivity._sum.xpEarned ?? 0;

      const allActivity = await prisma.userActivity.groupBy({
        by: ["userId"],
        where: periodStart ? { createdAt: { gte: periodStart } } : undefined,
        _sum: { xpEarned: true },
      });
      const higherCount = allActivity.filter(
        (a) => (a._sum.xpEarned ?? 0) > myXp
      ).length;

      myRank = {
        id: profile.id,
        rank: higherCount + 1,
        name: profile.name ?? "Usuario",
        level: profile.level,
        xp: myXp,
        title: profile.title ?? null,
        streakDays: profile.streakDays,
      };
    }

    const [transactionsCount, activeUsers, avgStreakResult] = await Promise.all([
      prisma.transaction.count({
        where: periodStart ? { createdAt: { gte: periodStart } } : undefined,
      }),
      prisma.userActivity
        .groupBy({
          by: ["userId"],
          where: periodStart
            ? { createdAt: { gte: periodStart } }
            : undefined,
        })
        .then((groups) => groups.length),
      prisma.userProfile.aggregate({
        _avg: { streakDays: true },
      }),
    ]);

    return NextResponse.json({
      entries,
      myRank,
      stats: {
        transactionsCount,
        activeUsers,
        avgStreak: Math.round(avgStreakResult._avg.streakDays ?? 0),
      },
    });
  } catch (error) {
    logger.error("Failed to fetch leaderboard", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
