import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthFromRequest } from "@/lib/auth-from-request";
import { withRateLimit } from "@/lib/with-rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().optional(),
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  currency: z.string().default("COP"),
  date: z.string().datetime().optional(),
  accountId: z.string().optional(),
  bankAccountId: z.string().optional(),
});

export const GET = withRateLimit(
  async (request: Request) => {
    try {
      const auth = await requireAuthFromRequest(request);
      if (!auth?.org || !auth.profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const transactions = await prisma.transaction.findMany({
        where: {
          organizationId: auth.org.id,
          scope: "PERSONAL",
          userId: auth.profile.id,
        },
        include: { account: true, bankAccount: true },
        orderBy: { date: "desc" },
        take: 100,
      });

      return NextResponse.json({ transactions });
    } catch (error) {
      logger.error("Failed to fetch personal transactions", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }
  },
  { key: "personal-transactions-read", maxRequests: 60, windowMs: 60000 }
);

export const POST = withRateLimit(
  async (request: Request) => {
    try {
      const auth = await requireAuthFromRequest(request);
      if (!auth?.org || !auth.profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
      }

      const { type, category, description, amount, currency, date, accountId, bankAccountId } = parsed.data;

      const transaction = await prisma.transaction.create({
        data: {
          organizationId: auth.org.id,
          userId: auth.profile.id,
          type,
          category: category || (type === "INCOME" ? "Ingresos" : "Otros"),
          description,
          amount,
          currency,
          date: date ? new Date(date) : new Date(),
          scope: "PERSONAL",
          accountId,
          bankAccountId,
        },
        include: { account: true, bankAccount: true },
      });

      return NextResponse.json({ transaction });
    } catch (error) {
      logger.error("Failed to create personal transaction", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
    }
  },
  { key: "personal-transactions-write", maxRequests: 30, windowMs: 60000 }
);
