import { stripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import type { PrismaClient } from "@/generated/prisma/client";
import type Stripe from "stripe";

export type StripeEvent = Stripe.Event;

type StripeSub = Stripe.Subscription & {
  current_period_start: number;
  current_period_end: number;
};

type StripeInvoice = Stripe.Invoice & { subscription: string };

export function verifyStripeWebhook(
  payload: string,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

export async function resolveStripeOrganizationId(
  event: Stripe.Event,
  prisma: PrismaClient
): Promise<string | null> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      return (session.metadata?.organizationId as string | undefined) || null;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as unknown as StripeInvoice;
      if (!invoice.subscription) return null;
      const subscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: invoice.subscription },
      });
      return subscription?.organizationId ?? null;
    }
    case "customer.subscription.deleted": {
      const stripeSub = event.data.object as Stripe.Subscription;
      const subscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: stripeSub.id },
      });
      return subscription?.organizationId ?? null;
    }
    default:
      return null;
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  prisma: PrismaClient
): Promise<void> {
  const metadata = session.metadata || {};
  const type = metadata.type;

  if (type === "payment_link") {
    const paymentLinkId = metadata.paymentLinkId as string | undefined;
    const orgId = metadata.organizationId as string | undefined;

    if (!paymentLinkId || !orgId) return;

    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        organizationId: orgId,
        metadata: {
          path: ["stripeSessionId"],
          equals: session.id,
        },
      },
    });
    if (existingTransaction) return;

    const link = await prisma.paymentLink.findUnique({
      where: { id: paymentLinkId },
    });
    if (!link || link.status !== "ACTIVE") return;

    const newCount = link.currentPayments + 1;
    const newStatus =
      link.maxPayments && newCount >= link.maxPayments ? "EXHAUSTED" : link.status;

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
    return;
  }

  // Subscription payment
  const orgId = metadata.organizationId as string | undefined;
  const plan = session.metadata?.plan as "STARTER" | "GROWTH" | "SCALE" | undefined;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!orgId || !subscriptionId) return;

  const stripeSub = (await stripe.subscriptions.retrieve(
    subscriptionId
  )) as unknown as StripeSub;

  await prisma.subscription.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: stripeSub.items?.data?.[0]?.price?.id,
      status: "ACTIVE",
      plan: plan || "STARTER",
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
    },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: stripeSub.items?.data?.[0]?.price?.id,
      status: "ACTIVE",
      plan: plan || "STARTER",
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
    },
  });
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  prisma: PrismaClient
): Promise<void> {
  const subscriptionId = (invoice as unknown as StripeInvoice).subscription;
  if (!subscriptionId) return;
  const stripeSub = (await stripe.subscriptions.retrieve(
    subscriptionId
  )) as unknown as StripeSub;
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      status: "ACTIVE",
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
    },
  });
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  prisma: PrismaClient
): Promise<void> {
  const subscriptionId = (invoice as unknown as StripeInvoice).subscription;
  if (!subscriptionId) return;
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: { status: "PAST_DUE" },
  });
}

async function handleSubscriptionDeleted(
  stripeSub: Stripe.Subscription,
  prisma: PrismaClient
): Promise<void> {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: stripeSub.id },
    data: { status: "CANCELLED" },
  });
}

export async function processStripeEvent(
  event: Stripe.Event,
  prisma: PrismaClient
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session,
        prisma
      );
      break;
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice, prisma);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, prisma);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, prisma);
      break;
    default:
      logger.debug("Unhandled Stripe event type", { type: event.type });
  }
}

export async function recordStripeWebhookEvent(
  event: Stripe.Event,
  organizationId: string,
  status: "PENDING" | "PROCESSED" | "FAILED",
  errorMessage: string | null,
  prisma: PrismaClient
): Promise<void> {
  if (!event.id) return;

  const existing = await prisma.webhookEvent.findFirst({
    where: {
      provider: "STRIPE",
      externalId: event.id,
    },
  });

  const payload = {
    ...(event as unknown as Record<string, unknown>),
    ...(errorMessage ? { __processingMeta: { error: errorMessage } } : {}),
  };

  if (existing) {
    await prisma.webhookEvent.update({
      where: { id: existing.id },
      data: {
        status,
        processedAt: status === "PROCESSED" ? new Date() : existing.processedAt,
        payload: payload as import("@/generated/prisma/client").Prisma.InputJsonValue,
      },
    });
  } else {
    await prisma.webhookEvent.create({
      data: {
        organizationId,
        provider: "STRIPE",
        eventType: event.type,
        externalId: event.id,
        payload: payload as import("@/generated/prisma/client").Prisma.InputJsonValue,
        status,
        processedAt: status === "PROCESSED" ? new Date() : null,
      },
    });
  }
}
