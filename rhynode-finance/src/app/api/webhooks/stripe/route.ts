import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

type StripeSub = Stripe.Subscription & {
  current_period_start: number;
  current_period_end: number;
};

type StripeInvoice = Stripe.Invoice & { subscription: string };

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

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error("Stripe webhook signature verification failed", { message });
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Idempotency: skip already processed events (only after signature verified)
    if (event.id) {
      const existing = await prisma.webhookEvent.findFirst({
        where: {
          provider: "STRIPE",
          externalId: event.id,
          status: "PROCESSED",
        },
      });
      if (existing) {
        return NextResponse.json({ received: true });
      }
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const type = metadata.type;

        if (type === "payment_link") {
          // Payment link payment
          const paymentLinkId = metadata.paymentLinkId;
          const orgId = metadata.organizationId;

          if (paymentLinkId && orgId) {
            const link = await prisma.paymentLink.findUnique({
              where: { id: paymentLinkId },
            });

            if (link && link.status === "ACTIVE") {
              const newCount = link.currentPayments + 1;
              const newStatus =
                link.maxPayments && newCount >= link.maxPayments
                  ? "EXHAUSTED"
                  : link.status;

              await prisma.paymentLink.update({
                where: { id: paymentLinkId },
                data: {
                  currentPayments: newCount,
                  status: newStatus,
                },
              });

              await prisma.transaction.create({
                data: {
                  organizationId: orgId,
                  type: "INCOME",
                  category: "Pagos Online",
                  description: `Pago Stripe via link: ${link.name}`,
                  amount: link.amount,
                  currency: link.currency,
                  date: new Date(),
                  reference: session.payment_intent as string,
                  metadata: {
                    stripeSessionId: session.id,
                    paymentLinkId,
                    customerEmail: session.customer_details?.email,
                  },
                },
              });
            }
          }
        } else {
          // Subscription payment
          const orgId = metadata.organizationId;
          const plan = session.metadata?.plan as "STARTER" | "GROWTH" | "SCALE";
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;

          if (orgId && subscriptionId) {
            const stripeSub = await stripe.subscriptions.retrieve(
              subscriptionId
            ) as unknown as StripeSub;

            await prisma.subscription.upsert({
              where: { organizationId: orgId },
              create: {
                organizationId: orgId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                stripePriceId: stripeSub.items?.data?.[0]?.price?.id,
                status: "ACTIVE",
                plan: plan || "STARTER",
                currentPeriodStart: new Date(
                  stripeSub.current_period_start * 1000
                ),
                currentPeriodEnd: new Date(
                  stripeSub.current_period_end * 1000
                ),
              },
              update: {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                stripePriceId: stripeSub.items?.data?.[0]?.price?.id,
                status: "ACTIVE",
                plan: plan || "STARTER",
                currentPeriodStart: new Date(
                  stripeSub.current_period_start * 1000
                ),
                currentPeriodEnd: new Date(
                  stripeSub.current_period_end * 1000
                ),
              },
            });
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as unknown as StripeInvoice;
        const subscriptionId = invoice.subscription;
        if (subscriptionId) {
          const stripeSub = await stripe.subscriptions.retrieve(
            subscriptionId
          ) as unknown as StripeSub;
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: {
              status: "ACTIVE",
              currentPeriodStart: new Date(
                stripeSub.current_period_start * 1000
              ),
              currentPeriodEnd: new Date(
                stripeSub.current_period_end * 1000
              ),
            },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as unknown as StripeInvoice;
        const subscriptionId = invoice.subscription;
        if (subscriptionId) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { status: "PAST_DUE" },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: stripeSub.id },
          data: { status: "CANCELLED" },
        });
        break;
      }
    }

    // Record processed event for idempotency when possible
    try {
      const orgId =
        (event.data.object as Stripe.Checkout.Session)?.metadata?.organizationId ||
        (await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: (event.data.object as unknown as { subscription?: string }).subscription },
        }))?.organizationId;
      if (orgId && event.id) {
        await prisma.webhookEvent.create({
          data: {
            organizationId: orgId,
            provider: "STRIPE",
            eventType: event.type,
            externalId: event.id,
            payload: JSON.parse(payload) as import("@/generated/prisma/client").Prisma.InputJsonValue,
            status: "PROCESSED",
            processedAt: new Date(),
          },
        });
      }
    } catch (recordErr) {
      logger.error("Failed to record Stripe webhook event", {
        error: recordErr instanceof Error ? recordErr.message : String(recordErr),
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Stripe webhook error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
