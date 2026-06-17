import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  verifyWompiWebhook,
  resolveWompiOrganizationId,
  processWompiEvent,
  recordWompiWebhookEvent,
} from "@/lib/webhooks/wompi";

const WOMPI_EVENTS_KEY = process.env.WOMPI_EVENTS_KEY;

export async function POST(request: Request) {
  try {
    const prisma = getPrisma();
    const body = await request.json();

    const event = body.event;
    const transaction = body.data?.transaction;

    if (event !== "transaction.updated" || !transaction) {
      return NextResponse.json({ received: true });
    }

    if (!WOMPI_EVENTS_KEY) {
      logger.error("WOMPI_EVENTS_KEY not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    if (!verifyWompiWebhook(body, WOMPI_EVENTS_KEY)) {
      logger.error("Wompi signature verification failed", {
        received: body.signature?.checksum,
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Idempotency and organization resolution
    const resolved = await resolveWompiOrganizationId(body, prisma);
    if (!resolved) {
      return NextResponse.json({ received: true });
    }

    const { organizationId } = resolved;
    const externalId = String(transaction.id);

    const existing = await prisma.webhookEvent.findFirst({
      where: {
        provider: "WOMPI",
        externalId,
        organizationId,
      },
    });
    if (existing?.status === "PROCESSED") {
      return NextResponse.json({ received: true });
    }

    await recordWompiWebhookEvent(body, organizationId, "PENDING", null, prisma);

    try {
      await processWompiEvent(body, prisma);
      await recordWompiWebhookEvent(body, organizationId, "PROCESSED", null, prisma);
    } catch (processingErr) {
      const message =
        processingErr instanceof Error ? processingErr.message : String(processingErr);
      logger.error("Wompi webhook processing failed", { error: message, transactionId: externalId });
      await recordWompiWebhookEvent(body, organizationId, "FAILED", message, prisma);
      return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Wompi webhook error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
