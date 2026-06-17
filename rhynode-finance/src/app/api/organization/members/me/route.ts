import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { normalizeRole } from "@/lib/organization";
import { getCurrentOrganization } from "@/lib/organization.server";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";

export const GET = withRateLimit(async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getCurrentOrganization(userId);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      role: normalizeRole(ctx.role),
      organizationId: ctx.org.id,
    });
  } catch (error) {
    logger.error("Failed to fetch organization role", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 });
  }
}, {"maxRequests": 60,"windowMs": 60000});
