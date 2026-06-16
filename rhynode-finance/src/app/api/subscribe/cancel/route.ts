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

      if (!sub?.stripeSubscriptionId) {
        return NextResponse.json({ error: "No active subscription" }, { status: 404 });
      }

      await stripe.subscriptions.cancel(sub.stripeSubscriptionId);

      await prisma.subscription.update({
        where: { organizationId: org.id },
        data: { cancelAtPeriodEnd: true, status: "CANCELED" },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
    }
  },
  { key: "subscribe-cancel", maxRequests: 10, windowMs: 60000 }
);
