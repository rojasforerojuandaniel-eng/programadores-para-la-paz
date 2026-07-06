import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe, PLANS } from "@/lib/stripe";
import { getCurrentOrganization } from "@/lib/organization.server";
import { canAdmin } from "@/lib/organization";
import { getPrisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { logger } from "@/lib/logger";

export const POST = withRateLimit(
  async (request: Request) => {
    try {
      const clerkSession = await auth();
      const userId = clerkSession?.userId;
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const ctx = await getCurrentOrganization(userId);
      if (!ctx || !canAdmin(ctx.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { plan } = await request.json();
      const planKey = (plan as keyof typeof PLANS) || "STARTER";
      const planConfig = PLANS[planKey];

      if (!planConfig?.priceId) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      }

      // Upsert Stripe customer
      const sub = await getPrisma().subscription.findUnique({
        where: { organizationId: ctx.org.id },
      });

      let customerId = sub?.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          name: ctx.org.name,
          metadata: { organizationId: ctx.org.id },
        });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: planConfig.priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?canceled=true`,
        metadata: { organizationId: ctx.org.id, plan: planKey },
        subscription_data: {
          metadata: { organizationId: ctx.org.id, plan: planKey },
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