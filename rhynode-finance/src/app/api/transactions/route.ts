import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { suggestCategory } from "@/lib/categorizer";
import { withRateLimit } from "@/lib/with-rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER", "ADJUSTMENT"]),
  category: z.string().optional(),
  description: z.string(),
  amount: z.number(),
  currency: z.enum(["COP", "MXN", "BRL", "USD"]).optional(),
  date: z.string().datetime().optional(),
  reference: z.string().optional(),
  bankAccountId: z.string().optional(),
  invoiceId: z.string().optional(),
  scope: z.enum(["PERSONAL", "BUSINESS"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const GET = withRateLimit(
  async () => {
    try {
      const org = await requireAuth();
      if (!org) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const transactions = await prisma.transaction.findMany({
        where: { organizationId: org.id, scope: "BUSINESS" },
        include: { bankAccount: true, invoice: true },
        orderBy: { date: "desc" },
      });

      return NextResponse.json({ transactions });
    } catch (error) {
      logger.error("Failed to fetch transactions", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      );
    }
  },
  { key: "transactions-read", maxRequests: 60, windowMs: 60000 }
);

export const POST = withRateLimit(
  async (request: Request) => {
    try {
      const org = await requireAuth();
      if (!org) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const parsed = createSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const {
        type,
        category,
        description,
        amount,
        currency = "COP",
        date,
        reference,
        bankAccountId,
        invoiceId,
        scope = "BUSINESS",
        metadata,
      } = parsed.data;

      // Validate ownership of referenced records
      if (bankAccountId) {
        const bankAccount = await prisma.bankAccount.findUnique({
          where: { id: bankAccountId },
        });
        if (!bankAccount || bankAccount.organizationId !== org.id) {
          return NextResponse.json(
            { error: "Invalid bank account" },
            { status: 400 }
          );
        }
      }

      if (invoiceId) {
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
        });
        if (!invoice || invoice.organizationId !== org.id) {
          return NextResponse.json(
            { error: "Invalid invoice" },
            { status: 400 }
          );
        }
      }

      const profile = await getUserProfile();
      const initialCategory = category || (type === "INCOME" ? "Ventas" : "Gastos");
      let transaction = await prisma.transaction.create({
        data: {
          organizationId: org.id,
          userId: scope === "PERSONAL" ? profile?.id : null,
          type,
          category: initialCategory,
          description,
          amount,
          currency,
          date: date ? new Date(date) : new Date(),
          reference,
          bankAccountId,
          invoiceId,
          scope,
          metadata: (metadata || {}) as unknown as import("@/generated/prisma/client").Prisma.InputJsonValue,
        },
        include: { bankAccount: true, invoice: true },
      });

      // AI categorization
      const suggestion = suggestCategory(description, amount);
      if (suggestion.confidence >= 0.7) {
        transaction = await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            aiCategory: suggestion.category,
            aiConfidence: suggestion.confidence,
            category: suggestion.category,
          },
          include: { bankAccount: true, invoice: true },
        });
      }

      // Update bank account balance if applicable
      if (bankAccountId) {
        const delta =
          type === "INCOME" || type === "ADJUSTMENT" ? amount : -amount;
        await prisma.bankAccount.update({
          where: { id: bankAccountId },
          data: { balance: { increment: delta } },
        });
      }

      return NextResponse.json({ transaction });
    } catch (error) {
      logger.error("Failed to create transaction", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to create transaction" },
        { status: 500 }
      );
    }
  },
  { key: "transactions", maxRequests: 10, windowMs: 60000 }
);
