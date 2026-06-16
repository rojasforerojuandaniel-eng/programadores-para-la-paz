import { getPrisma } from "./prisma";
import { calculateLevel, getTitleForLevel } from "./levels";

export interface AchievementDef {
  type: string;
  name: string;
  description: string;
  icon: string;
  xpAwarded: number;
  category: "starter" | "consistency" | "advanced";
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Primeros Pasos
  {
    type: "FIRST_TRANSACTION",
    name: "Primer Paso",
    description: "Crear tu primera transaccion",
    icon: "Footprints",
    xpAwarded: 50,
    category: "starter",
  },
  {
    type: "FIRST_BUDGET",
    name: "Planificador",
    description: "Crear tu primer presupuesto",
    icon: "Calculator",
    xpAwarded: 50,
    category: "starter",
  },
  {
    type: "FIRST_GOAL",
    name: "Sonador",
    description: "Crear tu primera meta de ahorro",
    icon: "Target",
    xpAwarded: 50,
    category: "starter",
  },
  {
    type: "FIRST_INVOICE",
    name: "Facturador",
    description: "Crear tu primera factura",
    icon: "FileText",
    xpAwarded: 50,
    category: "starter",
  },
  {
    type: "FIRST_RECEIPT",
    name: "Organizado",
    description: "Subir tu primer recibo",
    icon: "Receipt",
    xpAwarded: 50,
    category: "starter",
  },
  // Consistencia
  {
    type: "STREAK_7",
    name: "Semana Perfecta",
    description: "7 dias consecutivos",
    icon: "Flame",
    xpAwarded: 25,
    category: "consistency",
  },
  {
    type: "STREAK_30",
    name: "Mes Intacto",
    description: "30 dias consecutivos",
    icon: "CalendarCheck",
    xpAwarded: 100,
    category: "consistency",
  },
  {
    type: "BUDGET_MASTER",
    name: "Dentro del Presupuesto",
    description: "3 meses sin exceder presupuesto",
    icon: "ShieldCheck",
    xpAwarded: 150,
    category: "consistency",
  },
  {
    type: "GOAL_COMPLETED",
    name: "Cumplidor",
    description: "Completar primera meta",
    icon: "Trophy",
    xpAwarded: 100,
    category: "consistency",
  },
  // Avanzado
  {
    type: "SAVINGS_1M",
    name: "Millonario",
    description: "Ahorrar 1 millon COP",
    icon: "Coins",
    xpAwarded: 200,
    category: "advanced",
  },
  {
    type: "TRANSACTIONS_100",
    name: "Veterano",
    description: "100 transacciones registradas",
    icon: "BookOpen",
    xpAwarded: 150,
    category: "advanced",
  },
  {
    type: "INVOICES_50",
    name: "Empresario",
    description: "50 facturas emitidas",
    icon: "Briefcase",
    xpAwarded: 150,
    category: "advanced",
  },
  {
    type: "NET_WORTH_POSITIVE",
    name: "En Positivo",
    description: "Patrimonio neto mayor a 0",
    icon: "TrendingUp",
    xpAwarded: 200,
    category: "advanced",
  },
  {
    type: "NO_DEBT",
    name: "Libre",
    description: "Pagar todas las deudas",
    icon: "CheckCircle",
    xpAwarded: 250,
    category: "advanced",
  },
  {
    type: "LEVEL_50",
    name: "Maestro",
    description: "Alcanzar nivel 50",
    icon: "Crown",
    xpAwarded: 500,
    category: "advanced",
  },
];

export async function checkAndUnlockAchievement(
  userId: string,
  type: string
): Promise<
  | {
      id: string;
      userId: string;
      type: string;
      name: string;
      description: string;
      icon: string | null;
      xpAwarded: number;
      unlockedAt: Date | null;
      createdAt: Date;
    }
  | null
> {
  const prisma = getPrisma();
  const def = ACHIEVEMENTS.find((a) => a.type === type);
  if (!def) return null;

  const existing = await prisma.achievement.findUnique({
    where: { userId_type: { userId, type } },
  });

  if (existing) return null;

  const achievement = await prisma.achievement.create({
    data: {
      userId,
      type,
      name: def.name,
      description: def.description,
      icon: def.icon,
      xpAwarded: def.xpAwarded,
      unlockedAt: new Date(),
    },
  });

  // Grant achievement XP directly by updating profile and logging activity
  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
  });

  if (profile) {
    const newXp = profile.xp + def.xpAwarded;
    const newLevel = calculateLevel(newXp);
    const newTitle = getTitleForLevel(newLevel);

    await prisma.userProfile.update({
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
        action: `ACHIEVEMENT_${type}`,
        xpEarned: def.xpAwarded,
      },
    });
  }

  return achievement;
}
