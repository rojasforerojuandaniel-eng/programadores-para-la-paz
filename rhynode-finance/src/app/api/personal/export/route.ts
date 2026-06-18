import { getUserProfile, getOrCreateAuthOrg } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";

/**
 * Full data export (portabilidad). Returns the user's data as a single JSON
 * document — transactions, accounts, budgets, goals, debts, subscriptions,
 * recurring, categories, invoices, clients. Decimals are serialized as numbers.
 */
export const GET = withRateLimit(
  async () => {
    const profile = await getUserProfile();
    if (!profile) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getOrCreateAuthOrg().catch(() => null);
    const prisma = getPrisma();
    const orgId = org?.id ?? null;
    // Personal export: include the user's own transactions + shared business
    // transactions, but never other members' personal transactions.
    const transactionWhere = orgId
      ? {
          organizationId: orgId,
          OR: [{ scope: "BUSINESS" }, { userId: profile.id }, { userId: null }],
        }
      : { userId: profile.id };

    const [
      accounts,
      transactions,
      budgets,
      goals,
      debts,
      subscriptions,
      recurring,
      categories,
      invoices,
      clients,
    ] = await Promise.all([
      prisma.account.findMany({ where: { userId: profile.id } }),
      prisma.transaction.findMany({ where: transactionWhere, orderBy: { date: "desc" } }),
      prisma.budget.findMany({ where: { userId: profile.id } }),
      prisma.goal.findMany({ where: { userId: profile.id } }),
      prisma.debt.findMany({ where: { userId: profile.id } }),
      prisma.detectedSubscription.findMany({ where: { userId: profile.id } }),
      prisma.recurringTransaction.findMany({ where: { userId: profile.id } }),
      prisma.category.findMany({ where: { userId: profile.id } }),
      orgId ? prisma.invoice.findMany({ where: { organizationId: orgId } }) : [],
      orgId ? prisma.client.findMany({ where: { organizationId: orgId } }) : [],
    ]);

    const num = (v: { toString(): string } | null) => (v ? Number(v) : null);

    const data = {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      profile: { id: profile.id, email: profile.email ?? null, currency: org?.currency ?? "COP" },
      accounts: accounts.map((a) => ({ ...a, balance: num(a.balance as unknown as { toString(): string }) })),
      transactions: transactions.map((t) => ({
        ...t,
        amount: num(t.amount as unknown as { toString(): string }),
      })),
      budgets: budgets.map((b) => ({
        ...b,
        amount: num(b.amount as unknown as { toString(): string }),
        spent: num(b.spent as unknown as { toString(): string }),
      })),
      goals: goals.map((g) => ({
        ...g,
        currentAmount: num(g.currentAmount as unknown as { toString(): string }),
        targetAmount: num(g.targetAmount as unknown as { toString(): string }),
      })),
      debts: debts.map((d) => ({
        ...d,
        principalAmount: num(d.principalAmount as unknown as { toString(): string }),
        remainingAmount: num(d.remainingAmount as unknown as { toString(): string }),
      })),
      subscriptions: subscriptions.map((s) => ({ ...s, amount: num(s.amount as unknown as { toString(): string }) })),
      recurring,
      categories,
      invoices: invoices.map((i) => ({
        ...i,
        subtotal: num(i.subtotal as unknown as { toString(): string }),
        total: num(i.total as unknown as { toString(): string }),
      })),
      clients,
    };

    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="rhynode-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  },
  { key: "data-export", maxRequests: 5, windowMs: 60000 }
);