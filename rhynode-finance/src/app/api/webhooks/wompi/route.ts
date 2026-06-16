import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import crypto from "crypto";

// Wompi events integrity key (set in Vercel env, never in code)
const WOMPI_EVENTS_KEY = process.env.WOMPI_EVENTS_KEY;

export async function POST(request: Request) {
  try {
    const prisma = getPrisma();
    const body = await request.json();

    // Wompi sends events in this shape:
    // { event: "transaction.updated", data: { transaction: { ... } }, signature: { properties: [...], checksum: "..." } }
    const event = body.event;
    const transaction = body.data?.transaction;
    const signature = body.signature;

    if (event !== "transaction.updated" || !transaction) {
      return NextResponse.json({ received: true });
    }

    // Wompi signature verification is mandatory
    if (!WOMPI_EVENTS_KEY) {
      logger.error("WOMPI_EVENTS_KEY not configured");
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    if (!signature?.properties || !signature?.checksum) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
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
      .createHmac("sha256", WOMPI_EVENTS_KEY)
      .update(values)
      .digest("hex");
    if (signature.checksum !== expected) {
      logger.error("Wompi signature verification failed", {
        expected,
        received: signature.checksum,
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Idempotency
    if (transaction.id) {
      const existing = await prisma.webhookEvent.findFirst({
        where: {
          provider: "WOMPI",
          externalId: String(transaction.id),
          status: "PROCESSED",
        },
      });
      if (existing) {
        return NextResponse.json({ received: true });
      }
    }

    const status = transaction.status;
    const reference = transaction.reference;

    if (status !== "APPROVED") {
      return NextResponse.json({ received: true });
    }

    // Find payment link by Wompi reference
    const link = await prisma.paymentLink.findFirst({
      where: {
        config: {
          path: ["wompiReference"],
          equals: reference,
        },
      },
    });

    if (!link || link.status !== "ACTIVE") {
      return NextResponse.json({ received: true });
    }

    const updatedLink = await prisma.paymentLink.update({
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

    await prisma.$transaction([
      prisma.transaction.create({
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
      }),
      prisma.webhookEvent.create({
        data: {
          organizationId: link.organizationId,
          provider: "WOMPI",
          eventType: event,
          externalId: String(transaction.id),
          payload: body as import("@/generated/prisma/client").Prisma.InputJsonValue,
          status: "PROCESSED",
          processedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ received: true, status: updatedLink.status });
  } catch (error) {
    logger.error("Wompi webhook error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
