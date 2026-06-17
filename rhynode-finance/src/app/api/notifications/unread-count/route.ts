import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";

export const GET = withRateLimit(async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();
    const count = await prisma.notification.count({
      where: { userId: profile.id, read: false },
    });

    return NextResponse.json({ count });
  } catch (error) {
    logger.error("Failed to fetch unread notifications count", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to fetch notifications count" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});