import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuthFromRequest } from "@/lib/auth-from-request";
import { withRateLimit, type RouteContext } from "@/lib/with-rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  category: z.string().optional(),
  description: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  date: z.string().datetime().optional(),
  accountId: z.string().optional(),
  bankAccountId: z.string().optional(),
});

type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: {
    account: true;
    bankAccount: true;
    organization: true;
  };
}>;

function serializeTransaction(
  transaction: TransactionWithRelations,
  organizationName: string
) {
  return {
    id: transaction.id,
    type: transaction.type,
    category: transaction.category,
    description: transaction.description,
    amount: Number(transaction.amount),
    currency: transaction.currency,
    date: transaction.date.toISOString(),
    accountName: transaction.account?.name ?? null,
    bankAccountName: transaction.bankAccount?.name ?? null,
    organizationName: transaction.organization?.name ?? organizationName,
  };
}

async function findScopedTransaction(id: string, orgId: string, userId: string): Promise<TransactionWithRelations | null> {
  return prisma.transaction.findFirst({
    where: {
      id,
      organizationId: orgId,
      scope: "PERSONAL",
      userId,
    },
    include: {
      account: true,
      bankAccount: true,
      organization: true,
    },
  });
}

export const GET = withRateLimit(
  async (request: Request, context?: RouteContext<{ id: string }>) => {
    try {
      const auth = await requireAuthFromRequest(request);
      if (!auth?.org || !auth.profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const params = await context?.params;
      const id = params?.id;
      if (!id) {
        return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });
      }

      const transaction = await findScopedTransaction(id, auth.org.id, auth.profile.id);
      if (!transaction) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      }

      return NextResponse.json({
        transaction: serializeTransaction(transaction, auth.org.name),
      });
    } catch (error) {
      logger.error("Failed to fetch personal transaction", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ error: "Failed to fetch transaction" }, { status: 500 });
    }
  },
  { key: "personal-transactions-read", maxRequests: 60, windowMs: 60000 }
);

export const PATCH = withRateLimit(
  async (request: Request, context?: RouteContext<{ id: string }>) => {
    try {
      const auth = await requireAuthFromRequest(request);
      if (!auth?.org || !auth.profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const params = await context?.params;
      const id = params?.id;
      if (!id) {
        return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });
      }

      const existing = await findScopedTransaction(id, auth.org.id, auth.profile.id);
      if (!existing) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      }

      const body = await request.json();
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { type, category, description, amount, currency, date, accountId, bankAccountId } = parsed.data;

      const transaction = await prisma.transaction.update({
        where: { id },
        data: {
          type,
          category,
          description,
          amount,
          currency,
          date: date ? new Date(date) : undefined,
          accountId,
          bankAccountId,
        },
        include: {
          account: true,
          bankAccount: true,
          organization: true,
        },
      });

      return NextResponse.json({
        transaction: serializeTransaction(transaction, auth.org.name),
      });
    } catch (error) {
      logger.error("Failed to update personal transaction", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
    }
  },
  { key: "personal-transactions-write", maxRequests: 30, windowMs: 60000 }
);

export const DELETE = withRateLimit(
  async (request: Request, context?: RouteContext<{ id: string }>) => {
    try {
      const auth = await requireAuthFromRequest(request);
      if (!auth?.org || !auth.profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const params = await context?.params;
      const id = params?.id;
      if (!id) {
        return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });
      }

      const existing = await findScopedTransaction(id, auth.org.id, auth.profile.id);
      if (!existing) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      }

      await prisma.transaction.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error("Failed to delete personal transaction", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
    }
  },
  { key: "personal-transactions-write", maxRequests: 30, windowMs: 60000 }
);
