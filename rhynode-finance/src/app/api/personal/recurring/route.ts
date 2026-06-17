import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { checkAndNotifySubscriptionReminder } from "@/lib/push-events";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().min(0),
  type: z.string().default("EXPENSE"),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  frequency: z.string().default("MONTHLY"),
  startDate: z.string().datetime().or(z.string()),
  endDate: z.string().datetime().or(z.string()).optional(),
  nextDueDate: z.string().datetime().or(z.string()),
  isSubscription: z.boolean().default(false),
  provider: z.string().optional(),
});

export const GET = withRateLimit(async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recurring = await prisma.recurringTransaction.findMany({
      where: { userId: profile.id },
      include: { category: true, account: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ recurring });
  } catch (error) {
    logger.error("Failed to fetch recurring", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to fetch recurring" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});

export const POST = withRateLimit(async function POST(request: Request) {
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

    const { name, description, amount, type, categoryId, accountId, frequency, startDate, endDate, nextDueDate, isSubscription, provider } = parsed.data;

    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category || category.userId !== profile.id) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
    }

    if (accountId) {
      const account = await prisma.account.findUnique({ where: { id: accountId } });
      if (!account || account.userId !== profile.id) {
        return NextResponse.json({ error: "Invalid account" }, { status: 400 });
      }
    }

    const recurring = await prisma.recurringTransaction.create({
      data: {
        userId: profile.id,
        name,
        description,
        amount,
        type,
        categoryId,
        accountId,
        frequency,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : undefined,
        nextDueDate: new Date(nextDueDate),
        isSubscription,
        provider,
      },
    });

    // Event-triggered push if this subscription is due within 7 days
    if (isSubscription) {
      void checkAndNotifySubscriptionReminder(profile.id, recurring.id).catch(() => null);
    }

    return NextResponse.json({ recurring });
  } catch (error) {
    logger.error("Failed to create recurring", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to create recurring" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});