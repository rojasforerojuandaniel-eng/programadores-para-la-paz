import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { withRateLimit } from "@/lib/with-rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().min(0),
  currency: z.string().default("COP"),
  deadline: z.string().datetime().or(z.string()).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export const GET = withRateLimit(
  async () => {
    try {
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const goals = await prisma.goal.findMany({
        where: { userId: profile.id },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ goals });
    } catch (error) {
      logger.error("Failed to fetch goals", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to fetch goals" },
        { status: 500 }
      );
    }
  },
  { key: "goals-read", maxRequests: 60, windowMs: 60000 }
);

export const POST = withRateLimit(
  async (request: Request) => {
    try {
      const profile = await getUserProfile();
      if (!profile) {
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

      const { name, targetAmount, currency, deadline, icon, color } = parsed.data;

      const goal = await prisma.goal.create({
        data: {
          userId: profile.id,
          name,
          targetAmount,
          currency,
          deadline: deadline ? new Date(deadline) : undefined,
          icon,
          color,
        },
      });

      return NextResponse.json({ goal });
    } catch (error) {
      logger.error("Failed to create goal", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to create goal" },
        { status: 500 }
      );
    }
  },
  { key: "goals", maxRequests: 10, windowMs: 60000 }
);
