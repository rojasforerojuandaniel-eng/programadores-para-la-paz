import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().min(0),
  currency: z.string().default("COP"),
  frequency: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
  provider: z.string().optional(),
  category: z.string().optional(),
});

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

    let subscription;
    if (existing) {
      subscription = await prisma.detectedSubscription.update({
        where: { id: existing.id },
        data: {
          ...parsed.data,
          lastDetectedAt: new Date(),
        },
      });
    } else {
      subscription = await prisma.detectedSubscription.create({
        data: {
          userId: profile.id,
          ...parsed.data,
        },
      });
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    logger.error("Failed to create subscription", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
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