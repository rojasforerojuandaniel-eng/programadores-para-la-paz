import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { subtractFrequency } from "@/app/dashboard/personal/subscriptions/subscription-utils";

const baseSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().min(0),
  currency: z.string().default("COP"),
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  provider: z.string().optional(),
  category: z.string().optional(),
  nextDueDate: z.string().optional(),
});

const createSchema = baseSchema;

const updateSchema = baseSchema.extend({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "PENDING_CANCELLATION", "CANCELLED"]).optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "PENDING_CANCELLATION", "CANCELED"]),
  cancellationUrl: z.string().url().optional(),
});

function parseNextDueDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptions = await prisma.detectedSubscription.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ subscriptions });
  } catch (error) {
    logger.error("Failed to fetch subscriptions", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const existing = await prisma.detectedSubscription.findFirst({
      where: { userId: profile.id, name: parsed.data.name },
    });

    const nextDueDate = parseNextDueDate(parsed.data.nextDueDate);
    const lastPaidAt = nextDueDate
      ? subtractFrequency(nextDueDate, parsed.data.frequency)
      : new Date();

    let subscription;
    if (existing) {
      subscription = await prisma.detectedSubscription.update({
        where: { id: existing.id },
        data: {
          ...parsed.data,
          lastPaidAt,
          lastDetectedAt: new Date(),
        },
      });
    } else {
      subscription = await prisma.detectedSubscription.create({
        data: {
          userId: profile.id,
          ...parsed.data,
          lastPaidAt,
          lastDetectedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    logger.error("Failed to create subscription", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.detectedSubscription.findFirst({
      where: { id: parsed.data.id, userId: profile.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const parsedNextDueDate = parseNextDueDate(parsed.data.nextDueDate);
    const lastPaidAt = parsedNextDueDate
      ? subtractFrequency(parsedNextDueDate, parsed.data.frequency)
      : existing.lastPaidAt;

    const { id, nextDueDate: nextDueDateInput, ...data } = parsed.data;
    void nextDueDateInput;
    const subscription = await prisma.detectedSubscription.update({
      where: { id },
      data: {
        ...data,
        lastPaidAt,
      },
    });

    return NextResponse.json({ subscription });
  } catch (error) {
    logger.error("Failed to update subscription", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, status, cancellationUrl } = parsed.data;

    const existing = await prisma.detectedSubscription.findFirst({
      where: { id, userId: profile.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const canceledAt = status === "CANCELED" ? new Date() : null;

    const subscription = await prisma.detectedSubscription.update({
      where: { id },
      data: {
        status,
        canceledAt,
        ...(cancellationUrl !== undefined ? { cancellationUrl } : {}),
      },
    });

    return NextResponse.json({ subscription });
  } catch (error) {
    logger.error("Failed to update subscription status", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to update subscription status" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const existing = await prisma.detectedSubscription.findFirst({
      where: { id, userId: profile.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.detectedSubscription.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Failed to delete subscription", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 });
  }
}
