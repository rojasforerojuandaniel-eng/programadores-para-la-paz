import crypto from "crypto";
import type { PrismaClient } from "@/generated/prisma/client";

interface WompiSignature {
  properties: string[];
  checksum: string;
}

interface WompiTransaction {
  id: string;
  status: string;
  reference: string;
}

export interface WompiBody {
  event: string;
  data?: {
    transaction?: WompiTransaction;
  };
  signature?: WompiSignature;
}

export function verifyWompiWebhook(body: WompiBody, key: string): boolean {
  const signature = body.signature;
  if (!signature?.properties || !signature?.checksum) {
    return false;
  }

  const values = signature.properties
    .map((prop: string) => {
      const parts = prop.split(".");
      let value: unknown = body;
      for (const part of parts) {
        value = (value as Record<string, unknown>)?.[part];
      }
      return value ?? "";
    })
    .join("");

  const expected = crypto
    .createHmac("sha256", key)
    .update(values)
    .digest("hex");

  const received = Buffer.from(signature.checksum);
  const expectedBuf = Buffer.from(expected);
  if (received.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(received, expectedBuf);
}

export async function resolveWompiOrganizationId(
  body: WompiBody,
  prisma: PrismaClient
): Promise<{ organizationId: string; link: import("@/generated/prisma/client").PaymentLink } | null> {
  const transaction = body.data?.transaction;
  if (!transaction?.reference) return null;

  const link = await prisma.paymentLink.findFirst({
    where: {
      config: {
        path: ["wompiReference"],
        equals: transaction.reference,
      },
    },
  });

  if (!link) return null;
  return { organizationId: link.organizationId, link };
}

export async function processWompiEvent(
  body: WompiBody,
  prisma: PrismaClient
): Promise<void> {
  const event = body.event;
  const transaction = body.data?.transaction;

  if (event !== "transaction.updated" || !transaction) {
    return;
  }

  const status = transaction.status;
  const reference = transaction.reference;

  if (status !== "APPROVED") {
    return;
  }

  const link = await prisma.paymentLink.findFirst({
    where: {
      config: {
        path: ["wompiReference"],
        equals: reference,
      },
    },
  });

  if (!link || link.status !== "ACTIVE") {
    return;
  }

  // Idempotency guard: don't duplicate Wompi payment-link transactions
  const existingTransaction = await prisma.transaction.findFirst({
    where: {
      organizationId: link.organizationId,
      reference: transaction.id,
    },
  });

  if (existingTransaction) {
    return;
  }

  await prisma.paymentLink.update({
    where: { id: link.id },
    data: {
      currentPayments: { increment: 1 },
      status:
        link.maxPayments && link.currentPayments + 1 >= link.maxPayments
          ? "EXHAUSTED"
          : link.status,
      config: {
        ...(typeof link.config === "object" && link.config !== null
          ? link.config
          : {}),
        wompiPaid: true,
        wompiTransactionId: transaction.id,
      },
    },
  });

  await prisma.transaction.create({
    data: {
      organizationId: link.organizationId,
      type: "INCOME",
      category: "Pagos Online",
      description: `Pago Wompi via link: ${link.name}`,
      amount: link.amount,
      currency: link.currency,
      date: new Date(),
      reference: transaction.id,
      metadata: {
        wompiTransactionId: transaction.id,
        wompiReference: reference,
        paymentLinkId: link.id,
      },
    },
  });
}

export async function recordWompiWebhookEvent(
  body: WompiBody,
  organizationId: string,
  status: "PENDING" | "PROCESSED" | "FAILED",
  errorMessage: string | null,
  prisma: PrismaClient
): Promise<void> {
  const transaction = body.data?.transaction;
  const externalId = transaction?.id;
  if (!externalId) return;

  const existing = await prisma.webhookEvent.findFirst({
    where: {
      provider: "WOMPI",
      externalId: String(externalId),
    },
  });

  const payload = {
    ...body,
    ...(errorMessage ? { __processingMeta: { error: errorMessage } } : {}),
  };

  if (existing) {
    await prisma.webhookEvent.update({
      where: { id: existing.id },
      data: {
        status,
        processedAt: status === "PROCESSED" ? new Date() : existing.processedAt,
        payload: payload as unknown as import("@/generated/prisma/client").Prisma.InputJsonValue,
      },
    });
  } else {
    await prisma.webhookEvent.create({
      data: {
        organizationId,
        provider: "WOMPI",
        eventType: body.event,
        externalId: String(externalId),
        payload: payload as unknown as import("@/generated/prisma/client").Prisma.InputJsonValue,
        status,
        processedAt: status === "PROCESSED" ? new Date() : null,
      },
    });
  }
}
