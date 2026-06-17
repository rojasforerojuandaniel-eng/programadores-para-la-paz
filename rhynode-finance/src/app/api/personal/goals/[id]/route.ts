import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { withRateLimit, type RouteContext } from "@/lib/with-rate-limit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  targetAmount: z.number().min(0).optional(),
  currentAmount: z.number().min(0).optional(),
  currency: z.string().optional(),
  deadline: z.string().datetime().or(z.string()).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED"]).optional(),
});

export const PUT = withRateLimit(
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
      const parsed = updateSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const existing = await prisma.goal.findFirst({
        where: { id, userId: profile.id },
      });
      if (!existing) {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      }

      const { name, targetAmount, currentAmount, currency, deadline, icon, color, status } =
        parsed.data;

      const nextCurrent =
        typeof currentAmount === "number" ? currentAmount : undefined;
      const nextTarget =
        typeof targetAmount === "number" ? targetAmount : undefined;

      const computedStatus =
        status ??
        (nextCurrent !== undefined && nextTarget !== undefined && nextCurrent >= nextTarget
          ? "COMPLETED"
          : undefined);

      const goal = await prisma.goal.update({
        where: { id },
        data: {
          name,
          targetAmount: nextTarget,
          currentAmount: nextCurrent,
          currency,
          deadline: deadline ? new Date(deadline) : undefined,
          icon,
          color,
          status: computedStatus,
        },
      });

      revalidatePath("/dashboard/personal/goals");
      return NextResponse.json({ goal });
    } catch (error) {
      logger.error("Failed to update goal", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to update goal" },
        { status: 500 }
      );
    }
  },
  { key: "goals-update", maxRequests: 20, windowMs: 60000 }
);

export const DELETE = withRateLimit(
  async (_request: Request, context?: RouteContext<{ id: string }>) => {
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

      const existing = await prisma.goal.findFirst({
        where: { id, userId: profile.id },
      });
      if (!existing) {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      }

      await prisma.goal.delete({ where: { id } });
      revalidatePath("/dashboard/personal/goals");
      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error("Failed to delete goal", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to delete goal" },
        { status: 500 }
      );
    }
  },
  { key: "goals-delete", maxRequests: 20, windowMs: 60000 }
);
