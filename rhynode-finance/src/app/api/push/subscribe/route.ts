import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export const POST = withRateLimit(async function POST(request: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = subscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { endpoint, keys } = parsed.data;

    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: profile.id,
          endpoint,
        },
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        userId: profile.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to save push subscription", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});