import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { retryWebhookEvent } from "@/lib/webhooks/dispatcher";
import { logger } from "@/lib/logger";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handler(request: Request, context?: RouteContext) {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await (context?.params ?? Promise.resolve({ id: "" }));
    if (!id) {
      return NextResponse.json({ error: "Missing log ID" }, { status: 400 });
    }

    const prisma = getPrisma();
    const log = await prisma.webhookEvent.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    if (log.status === "PROCESSED") {
      return NextResponse.json(
        { error: "Cannot retry a successfully processed event" },
        { status: 409 }
      );
    }

    logger.info("webhook_retry_request", {
      logId: log.id,
      userId: org.id,
      provider: log.provider,
    });

    const result = await retryWebhookEvent(log);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Retry failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Webhook retry API error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Retry failed" }, { status: 500 });
  }
}

export const POST = withRateLimit(handler, {
  key: "webhook-retry",
  maxRequests: 20,
  windowMs: 60000,
});
