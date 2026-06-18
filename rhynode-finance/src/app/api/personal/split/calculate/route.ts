import { getUserProfile } from "@/lib/auth";
import { withRateLimit } from "@/lib/with-rate-limit";
import { computeBalances, suggestSettlements, type SplitGroup } from "@/lib/split-bills";
import { z } from "zod";

const memberSchema = z.object({ id: z.string().min(1), name: z.string() });
const expenseSchema = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.number(),
  paidBy: z.string(),
  shares: z.record(z.string(), z.number()).optional(),
  shareType: z.enum(["weight", "amount"]).optional(),
});

const bodySchema = z.object({
  name: z.string().default("Grupo"),
  currency: z.string().default("COP"),
  members: z.array(memberSchema).min(1),
  expenses: z.array(expenseSchema).default([]),
});

export const POST = withRateLimit(
  async (request: Request) => {
    const profile = await getUserProfile();
    if (!profile) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const group: SplitGroup = {
      id: "computed",
      name: parsed.data.name,
      currency: parsed.data.currency,
      members: parsed.data.members,
      expenses: parsed.data.expenses,
    };

    const balances = computeBalances(group);
    const settlements = suggestSettlements(balances);

    return Response.json({
      balances,
      settlements,
      totalSpent: parsed.data.expenses.reduce((sum, e) => sum + e.amount, 0),
    });
  },
  { key: "split-calculate", maxRequests: 60, windowMs: 60000 }
);