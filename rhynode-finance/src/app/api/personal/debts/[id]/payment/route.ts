import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile, getOrCreateAuthOrg } from "@/lib/auth";
import { withRateLimit, type RouteContext } from "@/lib/with-rate-limit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

const paymentSchema = z.object({
  amount: z.number().min(0.01, "El monto debe ser mayor a 0"),
});

export const POST = withRateLimit(
  async (request: Request, context?: RouteContext<{ id: string }>) => {
    try {
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const org = await getOrCreateAuthOrg();
      if (!org) {
        return NextResponse.json(
          { error: "Could not resolve organization" },
          { status: 500 }
        );
      }

      const params = await context?.params;
      const id = params?.id;
      if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
      }

      const body = await request.json();
      const parsed = paymentSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const debt = await prisma.debt.findFirst({
        where: { id, userId: profile.id },
      });
      if (!debt) {
        return NextResponse.json({ error: "Debt not found" }, { status: 404 });
      }

      if (debt.status === "PAID") {
        return NextResponse.json(
          { error: "La deuda ya está pagada" },
          { status: 400 }
        );
      }

      const payment = parsed.data.amount;
      const remaining = debt.remainingAmount.toNumber();
      if (payment > remaining) {
        return NextResponse.json(
          { error: "El pago no puede superar el saldo restante" },
          { status: 400 }
        );
      }

      const nextRemaining = Math.max(0, remaining - payment);
      const isPaid = nextRemaining === 0;
      const transactionType = debt.type === "OWE" ? "EXPENSE" : "INCOME";
      const metadata: Prisma.InputJsonValue = { debtId: debt.id };

      const [updatedDebt, transaction] = await prisma.$transaction([
        prisma.debt.update({
          where: { id },
          data: {
            remainingAmount: nextRemaining,
            status: isPaid ? "PAID" : debt.status,
          },
        }),
        prisma.transaction.create({
          data: {
            organizationId: org.id,
            userId: profile.id,
            type: transactionType,
            category: "Deudas",
            description: `Pago de ${debt.name}`,
            amount: payment,
            currency: debt.currency,
            date: new Date(),
            scope: "PERSONAL",
            metadata,
          },
        }),
      ]);

      revalidatePath("/dashboard/personal/debts");
      revalidatePath("/dashboard/personal/transactions");
      revalidatePath("/dashboard/personal");
      return NextResponse.json({ debt: updatedDebt, transaction });
    } catch (error) {
      logger.error("Failed to record debt payment", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to record payment" },
        { status: 500 }
      );
    }
  },
  { key: "debts-payment", maxRequests: 20, windowMs: 60000 }
);
