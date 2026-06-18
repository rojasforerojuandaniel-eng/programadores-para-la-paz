import { getUserProfile, getOrCreateAuthOrg } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { Prisma } from "@/generated/prisma/client";

/**
 * Seeds a realistic Colombian demo dataset for new users so the dashboard isn't
 * empty on first visit. Idempotent: refuses if the user already has transactions.
 * All demo rows are tagged ["demo"] so a follow-up delete can clean them.
 */
export const POST = withRateLimit(
  async () => {
    const profile = await getUserProfile();
    if (!profile) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();
    const org = await getOrCreateAuthOrg().catch(() => null);
    if (!org) {
      return Response.json({ error: "Organization not found" }, { status: 500 });
    }

    const existing = await prisma.transaction.count({
      where: { organizationId: org.id },
    });
    if (existing > 0) {
      return Response.json({
        seeded: false,
        message: "Ya tienes transacciones. No se agregaron datos demo.",
      });
    }

    const now = new Date();
    const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
    const cop = (n: number) => new Prisma.Decimal(n);

    // Accounts.
    const checking = await prisma.account.create({
      data: { userId: profile.id, name: "Cuenta Ahorros Bancolombia", type: "SAVINGS", balance: cop(2_350_000), currency: "COP" },
    });
    const cash = await prisma.account.create({
      data: { userId: profile.id, name: "Efectivo", type: "CASH", balance: cop(180_000), currency: "COP" },
    });

    type DemoTx = { type: "INCOME" | "EXPENSE"; description: string; amount: number; category: string; date: Date; accountId: string };
    const demo: DemoTx[] = [
      { type: "INCOME", description: "Salario mensual", amount: 3_500_000, category: "Salario", date: daysAgo(28), accountId: checking.id },
      { type: "EXPENSE", description: "Arriendo", amount: 1_200_000, category: "Vivienda", date: daysAgo(27), accountId: checking.id },
      { type: "EXPENSE", description: "Mercado Exito", amount: 320_000, category: "Mercado", date: daysAgo(20), accountId: checking.id },
      { type: "EXPENSE", description: "Rappi domicilio", amount: 45_000, category: "Transporte / Delivery", date: daysAgo(15), accountId: cash.id },
      { type: "EXPENSE", description: "Netflix", amount: 38_900, category: "Entretenimiento", date: daysAgo(14), accountId: checking.id },
      { type: "EXPENSE", description: "Spotify", amount: 24_900, category: "Entretenimiento", date: daysAgo(14), accountId: checking.id },
      { type: "EXPENSE", description: "Gasolina Terpel", amount: 120_000, category: "Transporte", date: daysAgo(10), accountId: cash.id },
      { type: "EXPENSE", description: "Almuerzo", amount: 35_000, category: "Restaurante", date: daysAgo(8), accountId: cash.id },
      { type: "EXPENSE", description: "Farmacia Cruz Verde", amount: 52_000, category: "Salud", date: daysAgo(6), accountId: checking.id },
      { type: "EXPENSE", description: "Claro postpago", amount: 79_900, category: "Telecomunicaciones", date: daysAgo(5), accountId: checking.id },
      { type: "EXPENSE", description: "Gimnasio SmartFit", amount: 89_000, category: "Salud", date: daysAgo(3), accountId: checking.id },
      { type: "INCOME", description: "Freelance diseño", amount: 600_000, category: "Ingreso extra", date: daysAgo(2), accountId: checking.id },
      { type: "EXPENSE", description: "Café Juan Valdez", amount: 18_000, category: "Café", date: daysAgo(1), accountId: cash.id },
    ];

    await prisma.transaction.createMany({
      data: demo.map((t) => ({
        organizationId: org.id,
        userId: profile.id,
        type: t.type,
        description: t.description,
        amount: cop(t.amount),
        currency: "COP",
        category: t.category,
        aiCategory: t.category,
        aiConfidence: 0.9,
        date: t.date,
        accountId: t.accountId,
        tags: ["demo"] as unknown as Prisma.InputJsonValue,
      })),
    });

    // A budget, a goal and a debt so the dashboard widgets show content.
    await prisma.budget.create({
      data: { userId: profile.id, name: "Comida", amount: cop(500_000), spent: cop(173_000), period: "MONTHLY", startDate: daysAgo(30) },
    });
    await prisma.goal.create({
      data: { userId: profile.id, name: "Fondo de emergencia", targetAmount: cop(6_000_000), currentAmount: cop(2_350_000), status: "ACTIVE" },
    });
    await prisma.debt.create({
      data: { userId: profile.id, name: "Tarjeta de crédito", type: "OWE", principalAmount: cop(1_800_000), remainingAmount: cop(1_200_000), currency: "COP", dueDate: daysAgo(-15) },
    });

    return Response.json({
      seeded: true,
      message: "Datos demo creados: 2 cuentas, 13 transacciones, 1 presupuesto, 1 meta y 1 deuda.",
    });
  },
  { key: "seed-demo", maxRequests: 3, windowMs: 60000 }
);

/** Removes all demo-tagged data so the user can start clean. */
export const DELETE = withRateLimit(
  async () => {
    const profile = await getUserProfile();
    if (!profile) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const prisma = getPrisma();
    const org = await getOrCreateAuthOrg().catch(() => null);
    if (!org) return Response.json({ error: "Organization not found" }, { status: 500 });

    const deleted = await prisma.transaction.deleteMany({
      where: { organizationId: org.id, tags: { equals: ["demo"] as Prisma.InputJsonValue } },
    });
    await prisma.budget.deleteMany({ where: { userId: profile.id, name: "Comida" } }).catch(() => undefined);
    await prisma.goal.deleteMany({ where: { userId: profile.id, name: "Fondo de emergencia" } }).catch(() => undefined);
    await prisma.debt.deleteMany({ where: { userId: profile.id, name: "Tarjeta de crédito" } }).catch(() => undefined);

    return Response.json({ deleted: deleted.count });
  },
  { key: "seed-demo", maxRequests: 5, windowMs: 60000 }
);