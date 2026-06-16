import { NextResponse } from "next/server";
import { stripe, PLANS } from "@/lib/stripe";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { logger } from "@/lib/logger";

export const POST = withRateLimit(
  async (request: Request) => {
    try {
      const org = await requireAuth();
      if (!org) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { plan } = await request.json();
      const planKey = (plan as keyof typeof PLANS) || "STARTER";
      const planConfig = PLANS[planKey];

      if (!planConfig?.priceId) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      }

      // Upsert Stripe customer
      const sub = await prisma.subscription.findUnique({
        where: { organizationId: org.id },
      });

      let customerId = sub?.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          name: org.name,
          metadata: { organizationId: org.id },
        });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: planConfig.priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?canceled=true`,
        metadata: { organizationId: org.id, plan: planKey },
        subscription_data: {
          metadata: { organizationId: org.id, plan: planKey },
        },
      });

      return NextResponse.json({ url: session.url });
    } catch (error) {
      logger.error("Failed to create checkout session", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }
  },
  { key: "subscribe", maxRequests: 10, windowMs: 60000 }
);