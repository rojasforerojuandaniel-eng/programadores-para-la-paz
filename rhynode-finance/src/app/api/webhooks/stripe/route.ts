import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  verifyStripeWebhook,
  resolveStripeOrganizationId,
  processStripeEvent,
  recordStripeWebhookEvent,
} from "@/lib/webhooks/stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    if (!webhookSecret) {
      logger.error("STRIPE_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    const prisma = getPrisma();
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    let event;
    try {
      event = verifyStripeWebhook(payload, signature, webhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error("Stripe webhook signature verification failed", { message });
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Resolve organization and record a pending event for observability.
    const organizationId = await resolveStripeOrganizationId(event, prisma);
    if (organizationId && event.id) {
      const existing = await prisma.webhookEvent.findFirst({
        where: {
          provider: "STRIPE",
          externalId: event.id,
          organizationId,
        },
      });
      if (existing?.status === "PROCESSED") {
        return NextResponse.json({ received: true });
      }
      await recordStripeWebhookEvent(event, organizationId, "PENDING", null, prisma);
    }

    try {
      await processStripeEvent(event, prisma);
      if (organizationId && event.id) {
        await recordStripeWebhookEvent(event, organizationId, "PROCESSED", null, prisma);
      }
    } catch (processingErr) {
      const message =
        processingErr instanceof Error ? processingErr.message : String(processingErr);
      logger.error("Stripe webhook processing failed", { error: message, eventId: event.id });
      if (organizationId && event.id) {
        await recordStripeWebhookEvent(event, organizationId, "FAILED", message, prisma);
      }
      return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Stripe webhook error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
