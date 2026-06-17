import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = withRateLimit(async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();
    const { count } = await prisma.notification.updateMany({
      where: { id, userId: profile.id },
      data: { read: true },
    });

    if (count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to mark notification as read", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});
