import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";

export const POST = withRateLimit(
  async () => {
    try {
      const org = await requireAuth();
      if (!org) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const sub = await prisma.subscription.findUnique({
        where: { organizationId: org.id },
      });

      if (!sub?.stripeCustomerId) {
        return NextResponse.json({ error: "No active subscription" }, { status: 404 });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
      });

      return NextResponse.json({ url: portalSession.url });
    } catch (error) {
      console.error("Failed to create portal session:", error);
      return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
    }
  },
  { key: "subscribe-portal", maxRequests: 10, windowMs: 60000 }
);
