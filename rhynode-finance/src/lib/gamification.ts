import { getPrisma } from "./prisma";
import {
  calculateLevel,
  getTitleForLevel,
} from "./levels";

export const ACTION_XP = {
  CREATE_TRANSACTION: 10,
  CREATE_ACCOUNT: 15,
  CREATE_BUDGET: 20,
  CREATE_GOAL: 25,
  COMPLETE_GOAL: 50,
  CREATE_INVOICE: 15,
  PAY_INVOICE: 20,
  STREAK_7: 25,
  STREAK_30: 100,
  FIRST_RECEIPT: 30,
  BUDGET_ON_TRACK: 15,
} as const;

export type GamificationAction = keyof typeof ACTION_XP;

interface AddXpResult {
  profile: {
    id: string;
    xp: number;
    level: number;
    title: string | null;
    streakDays: number;
    lastActiveAt: Date | null;
  };
  xpGained: number;
  leveledUp: boolean;
  previousLevel: number;
  newLevel: number;
}

export async function addXpInternal(
  userId: string,
  xpAmount: number,
  action: string
): Promise<AddXpResult | null> {
  const prisma = getPrisma();

  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
  });
  if (!profile) return null;

  const newXp = profile.xp + xpAmount;
  const newLevel = calculateLevel(newXp);
  const newTitle = getTitleForLevel(newLevel);

  const updated = await prisma.userProfile.update({
    where: { id: userId },
    data: {
      xp: newXp,
      level: newLevel,
      title: newTitle,
    },
  });

  await prisma.userActivity.create({
    data: {
      userId,
      action,
      xpEarned: xpAmount,
    },
  });

  return {
    profile: updated,
    xpGained: xpAmount,
    leveledUp: newLevel > profile.level,
    previousLevel: profile.level,
    newLevel,
  };
}

export async function addXp(
  userId: string,
  action: GamificationAction
): Promise<AddXpResult | null> {
  return addXpInternal(userId, ACTION_XP[action], action);
}
