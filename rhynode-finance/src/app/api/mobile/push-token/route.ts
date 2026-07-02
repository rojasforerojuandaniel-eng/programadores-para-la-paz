import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfileFromRequest } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";

const MAX_TOKENS_PER_USER = 5;

const tokenSchema = z.object({
  token: z.string().min(1),
});

export const POST = withRateLimit(async function POST(request: Request) {
  try {
    const profile = await getUserProfileFromRequest(request);
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = tokenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { token } = parsed.data;
    const prisma = getPrisma();

    await prisma.$transaction(async (tx) => {
      const existing = await tx.expoPushToken.findUnique({
        where: { token },
      });

      // Only enforce the cap when we are actually adding a new token for this user.
      if (!existing) {
        const count = await tx.expoPushToken.count({
          where: { userId: profile.id },
        });

        if (count >= MAX_TOKENS_PER_USER) {
          const tokensToDelete = await tx.expoPushToken.findMany({
            where: { userId: profile.id },
            orderBy: { createdAt: "asc" },
            take: count - (MAX_TOKENS_PER_USER - 1),
            select: { id: true },
          });

          if (tokensToDelete.length > 0) {
            await tx.expoPushToken.deleteMany({
              where: {
                id: { in: tokensToDelete.map((t) => t.id) },
              },
            });
          }
        }
      }

      await tx.expoPushToken.upsert({
        where: { token },
        update: { userId: profile.id },
        create: { userId: profile.id, token },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Failed to save Expo push token", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to save token" },
      { status: 500 }
    );
  }
}, { maxRequests: 60, windowMs: 60000 });

export const DELETE = withRateLimit(async function DELETE(request: Request) {
  try {
    const profile = await getUserProfileFromRequest(request);
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();
    await prisma.expoPushToken.deleteMany({
      where: { userId: profile.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("Failed to remove Expo push tokens", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to remove tokens" },
      { status: 500 }
    );
  }
}, { maxRequests: 60, windowMs: 60000 });
