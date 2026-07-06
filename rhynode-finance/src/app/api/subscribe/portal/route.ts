import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { getCurrentOrganization } from "@/lib/organization.server";
import { canAdmin } from "@/lib/organization";
import { getPrisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { logger } from "@/lib/logger";

export const POST = withRateLimit(
  async () => {
    try {
      const session = await auth();
      const userId = session?.userId;
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const ctx = await getCurrentOrganization(userId);
      if (!ctx || !canAdmin(ctx.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const sub = await getPrisma().subscription.findUnique({
        where: { organizationId: ctx.org.id },
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
      logger.error("Failed to create portal session", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
    }
  },
  { key: "subscribe-portal", maxRequests: 10, windowMs: 60000 }
);