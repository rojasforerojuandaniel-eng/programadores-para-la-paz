import { getPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  processStripeEvent,
  recordStripeWebhookEvent,
  type StripeEvent,
} from "@/lib/webhooks/stripe";
import { processWompiEvent, recordWompiWebhookEvent, type WompiBody } from "@/lib/webhooks/wompi";
import type { WebhookEvent } from "@/generated/prisma/client";

export async function retryWebhookEvent(
  log: WebhookEvent
): Promise<{ success: boolean; error?: string }> {
  const prisma = getPrisma();

  logger.info("webhook_retry_started", {
    logId: log.id,
    provider: log.provider,
    eventType: log.eventType,
    organizationId: log.organizationId,
  });

  try {
    if (log.provider === "STRIPE") {
      const payload = log.payload as Record<string, unknown>;
      // Remove internal metadata before reprocessing
      delete payload.__processingMeta;
      const event = payload as unknown as StripeEvent;
      await processStripeEvent(event, prisma);
      await recordStripeWebhookEvent(event, log.organizationId, "PROCESSED", null, prisma);
    } else if (log.provider === "WOMPI") {
      const body = log.payload as Record<string, unknown>;
      delete body.__processingMeta;
      await processWompiEvent(body as unknown as WompiBody, prisma);
      await recordWompiWebhookEvent(body as unknown as WompiBody, log.organizationId, "PROCESSED", null, prisma);
    } else {
      throw new Error(`Unsupported webhook provider: ${log.provider}`);
    }

    logger.info("webhook_retry_succeeded", {
      logId: log.id,
      provider: log.provider,
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("webhook_retry_failed", {
      logId: log.id,
      provider: log.provider,
      error: message,
    });

    // Update the log back to FAILED with the latest error
    try {
      if (log.provider === "STRIPE") {
        const payload = log.payload as Record<string, unknown>;
        const event = payload as unknown as StripeEvent;
        await recordStripeWebhookEvent(event, log.organizationId, "FAILED", message, prisma);
      } else if (log.provider === "WOMPI") {
        const body = log.payload as Record<string, unknown>;
        await recordWompiWebhookEvent(body as unknown as WompiBody, log.organizationId, "FAILED", message, prisma);
      }
    } catch (recordErr) {
      logger.error("webhook_retry_record_failed", {
        logId: log.id,
        error: recordErr instanceof Error ? recordErr.message : String(recordErr),
      });
    }

    return { success: false, error: message };
  }
}
