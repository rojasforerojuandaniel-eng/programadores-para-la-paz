import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfileFromRequest } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";

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

    await prisma.expoPushToken.upsert({
      where: { token },
      update: { userId: profile.id },
      create: { userId: profile.id, token },
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
