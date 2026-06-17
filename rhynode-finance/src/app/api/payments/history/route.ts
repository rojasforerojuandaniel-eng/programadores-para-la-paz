import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { logger } from "@/lib/logger";

export const GET = withRateLimit(
  async () => {
    try {
      const org = await requireAuth();
      if (!org) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const payments = await prisma.payment.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          amount: true,
          currency: true,
          method: true,
          status: true,
          externalId: true,
          paidAt: true,
          createdAt: true,
        },
      });

      const formatted = payments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        currency: payment.currency,
        method: payment.method,
        status: payment.status,
        externalId: payment.externalId,
        paidAt: payment.paidAt?.toISOString() ?? null,
        createdAt: payment.createdAt.toISOString(),
      }));

      return NextResponse.json({ payments: formatted });
    } catch (error) {
      logger.error("Failed to fetch payment history", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to fetch payment history" },
        { status: 500 }
      );
    }
  },
  { key: "payments-history", maxRequests: 30, windowMs: 60000 }
);
