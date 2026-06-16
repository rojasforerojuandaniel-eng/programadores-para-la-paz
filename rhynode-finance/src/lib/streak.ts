import { getPrisma } from "./prisma";
import { ACTION_XP, addXpInternal } from "./gamification";

export interface StreakResult {
  streak: number;
  updated: boolean;
  bonusXp: number;
}

export async function updateStreak(userId: string): Promise<StreakResult | null> {
  const prisma = getPrisma();
  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
  });
  if (!profile) return null;

  const now = new Date();
  const lastActive = profile.lastActiveAt;

  let newStreak = profile.streakDays;

  if (!lastActive) {
    newStreak = 1;
  } else {
    const lastDate = new Date(lastActive);
    lastDate.setHours(0, 0, 0, 0);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return { streak: newStreak, updated: false, bonusXp: 0 };
    } else if (diffDays === 1) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }
  }

  let bonusXp = 0;
  if (newStreak === 7) {
    bonusXp = ACTION_XP.STREAK_7;
  } else if (newStreak === 30) {
    bonusXp = ACTION_XP.STREAK_30;
  }

  const updated = await prisma.userProfile.update({
    where: { id: userId },
    data: {
      streakDays: newStreak,
      lastActiveAt: now,
    },
  });

  if (bonusXp > 0) {
    await addXpInternal(
      userId,
      bonusXp,
      newStreak === 7 ? "STREAK_7" : "STREAK_30"
    );
  }

  return {
    streak: updated.streakDays,
    updated: true,
    bonusXp,
  };
}
