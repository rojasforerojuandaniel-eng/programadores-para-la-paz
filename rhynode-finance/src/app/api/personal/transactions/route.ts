import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
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

function parsePagination(request: Request): { cursor: string | null; limit: number } {
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "25", 10);
  const limit = Number.isNaN(limitRaw) ? 25 : Math.min(Math.max(1, limitRaw), 100);
  return { cursor, limit };
}

export const GET = withRateLimit(
  async (request: Request) => {
    try {
      const auth = await requireAuthFromRequest(request);
      if (!auth?.org || !auth.profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { cursor, limit } = parsePagination(request);

      const baseWhere: Prisma.TransactionWhereInput = {
        organizationId: auth.org.id,
        scope: "PERSONAL",
        userId: auth.profile.id,
      };

      let where: Prisma.TransactionWhereInput = baseWhere;
      if (cursor) {
        const cursorTx = await prisma.transaction.findUnique({
          where: { id: cursor },
        });
        if (cursorTx) {
          where = {
            ...baseWhere,
            OR: [
              { date: { lt: cursorTx.date } },
              { date: cursorTx.date, id: { lt: cursor } },
            ],
          };
        }
      }

      const transactions = await prisma.transaction.findMany({
        where,
        include: { account: true, bankAccount: true },
        orderBy: [{ date: "desc" }, { id: "desc" }],
        take: limit + 1,
      });

      const nextCursor = transactions.length > limit ? transactions[limit].id : null;

      return NextResponse.json({
        transactions: transactions.slice(0, limit),
        nextCursor,
      });
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

      if (accountId) {
        const account = await prisma.account.findUnique({ where: { id: accountId } });
        if (!account || account.userId !== auth.profile.id) {
          return NextResponse.json({ error: "Invalid account" }, { status: 400 });
        }
      }

      if (bankAccountId) {
        const bankAccount = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
        if (!bankAccount || bankAccount.organizationId !== auth.org.id) {
          return NextResponse.json({ error: "Invalid bank account" }, { status: 400 });
        }
      }

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
