import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { withRateLimit, type RouteContext } from "@/lib/with-rate-limit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { auditLog } from "@/lib/audit-log";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["OWE", "OWED"]).optional(),
  counterparty: z.string().optional(),
  principalAmount: z.number().min(0).optional(),
  interestRate: z.number().min(0).optional(),
  remainingAmount: z.number().min(0).optional(),
  currency: z.string().optional(),
  dueDate: z.string().datetime().or(z.string()).optional(),
  status: z.enum(["ACTIVE", "PAID", "OVERDUE", "PAUSED"]).optional(),
  notes: z.string().optional(),
});

export const PUT = withRateLimit(
  async (request: Request, context?: RouteContext<{ id: string }>): Promise<Response> => {
    try {
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const params = await context?.params;
      const id = params?.id;
      if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
      }

      const body = await request.json();
      const parsed = updateSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const existing = await prisma.debt.findFirst({
        where: { id, userId: profile.id },
      });
      if (!existing) {
        return NextResponse.json({ error: "Debt not found" }, { status: 404 });
      }

      const {
        name,
        type,
        counterparty,
        principalAmount,
        interestRate,
        remainingAmount,
        currency,
        dueDate,
        status,
        notes,
      } = parsed.data;

      const nextRemaining =
        typeof remainingAmount === "number" ? remainingAmount : undefined;
      const nextPrincipal =
        typeof principalAmount === "number" ? principalAmount : undefined;
      const computedStatus =
        status ??
        (nextRemaining !== undefined && nextRemaining === 0
          ? "PAID"
          : undefined);

      auditLog({
        userId: profile?.id,
        action: "UPDATE_DEBT",
        resource: "debt",
        resourceId: id,
        metadata: { name, type, counterparty, remainingAmount: nextRemaining, status: computedStatus },
      });
      const debt = await prisma.debt.update({
        where: { id },
        data: {
          name,
          type,
          counterparty,
          principalAmount: nextPrincipal,
          interestRate,
          remainingAmount: nextRemaining,
          currency,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          status: computedStatus,
          notes,
        },
      });

      revalidatePath("/dashboard/personal/debts");
      return NextResponse.json({ debt });
    } catch (error) {
      logger.error("Failed to update debt", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to update debt" },
        { status: 500 }
      );
    }
  },
  { key: "debts-update", maxRequests: 20, windowMs: 60000 }
);

export const DELETE = withRateLimit(
  async (_request: Request, context?: RouteContext<{ id: string }>): Promise<Response> => {
    try {
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const params = await context?.params;
      const id = params?.id;
      if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
      }

      const existing = await prisma.debt.findFirst({
        where: { id, userId: profile.id },
      });
      if (!existing) {
        return NextResponse.json({ error: "Debt not found" }, { status: 404 });
      }

      auditLog({
        userId: profile?.id,
        action: "DELETE_DEBT",
        resource: "debt",
        resourceId: id,
      });
      await prisma.debt.delete({ where: { id } });
      revalidatePath("/dashboard/personal/debts");
      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error("Failed to delete debt", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to delete debt" },
        { status: 500 }
      );
    }
  },
  { key: "debts-delete", maxRequests: 20, windowMs: 60000 }
);
