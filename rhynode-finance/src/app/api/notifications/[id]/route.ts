import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const PATCH = withRateLimit(async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const read = typeof body === "object" && body !== null && (body as { read?: unknown }).read === true;

    const prisma = getPrisma();
    const { count } = await prisma.notification.updateMany({
      where: { id, userId: profile.id },
      data: { read },
    });

    if (count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to update notification", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});

export const DELETE = withRateLimit(async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();
    const { count } = await prisma.notification.deleteMany({
      where: { id, userId: profile.id },
    });

    if (count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete notification", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});
