import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { withRateLimit, type RouteContext } from "@/lib/with-rate-limit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";

const savingsSchema = z.object({
  amount: z.number().min(0.01, "El monto debe ser mayor a 0"),
});

export const POST = withRateLimit(
  async (request: Request, context?: RouteContext<{ id: string }>) => {
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
      const parsed = savingsSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const goal = await prisma.goal.findFirst({
        where: { id, userId: profile.id },
      });
      if (!goal) {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      }

      const amount = parsed.data.amount;
      const currentAmount = goal.currentAmount.toNumber();
      const targetAmount = goal.targetAmount.toNumber();
      const nextAmount = currentAmount + amount;
      const isCompleted = nextAmount >= targetAmount;

      const updated = await prisma.goal.update({
        where: { id },
        data: {
          currentAmount: nextAmount,
          status: isCompleted ? "COMPLETED" : goal.status,
        },
      });

      revalidatePath("/dashboard/personal/goals");
      return NextResponse.json({ goal: updated });
    } catch (error) {
      logger.error("Failed to add savings", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to add savings" },
        { status: 500 }
      );
    }
  },
  { key: "goals-savings", maxRequests: 20, windowMs: 60000 }
);
