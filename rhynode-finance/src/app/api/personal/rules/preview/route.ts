import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/with-rate-limit";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";

const previewSchema = z.object({
  condition: z.object({
    type: z.enum(["contains", "amountGreaterThan", "typeIs", "categoryIs"]),
    value: z.string().min(1),
  }),
});

function evaluateCondition(
  transaction: { description: string; type: string; amount: number; category: string | null },
  condition: { type: string; value: string }
): boolean {
  switch (condition.type) {
    case "contains": {
      const needle = condition.value.toLowerCase();
      const haystack = `${transaction.description} ${transaction.category ?? ""}`.toLowerCase();
      return haystack.includes(needle);
    }
    case "amountGreaterThan": {
      const threshold = Number(condition.value);
      return !Number.isNaN(threshold) && transaction.amount > threshold;
    }
    case "typeIs": {
      return transaction.type === condition.value;
    }
    case "categoryIs": {
      return transaction.category === condition.value;
    }
    default:
      return false;
  }
}

export const POST = withRateLimit(
  async (request: Request) => {
    try {
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const parsed = previewSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const prisma = getPrisma();
      const since = new Date();
      since.setDate(since.getDate() - 90);

      const transactions = await prisma.transaction.findMany({
        where: {
          userId: profile.id,
          categoryId: null,
          date: { gte: since },
        },
        select: {
          id: true,
          description: true,
          type: true,
          amount: true,
          category: true,
          date: true,
        },
        orderBy: { date: "desc" },
        take: 100,
      });

      const condition = parsed.data.condition;
      const matching = transactions
        .filter((t) =>
          evaluateCondition(
            {
              description: t.description,
              type: t.type,
              amount: Number(t.amount),
              category: t.category,
            },
            condition
          )
        )
        .slice(0, 20)
        .map((t) => ({
          id: t.id,
          description: t.description,
          type: t.type,
          amount: Number(t.amount),
          date: t.date.toISOString(),
        }));

      return NextResponse.json({ transactions: matching });
    } catch (error) {
      logger.error("Failed to preview rule matches", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to preview matches" },
        { status: 500 }
      );
    }
  },
  { key: "rules-preview", maxRequests: 30, windowMs: 60000 }
);
