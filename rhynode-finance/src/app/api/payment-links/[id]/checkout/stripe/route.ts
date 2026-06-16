import { decimalToNumber } from "@/lib/decimal";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";

export const POST = withRateLimit(
  async (
    request: Request,
    context?: { params: Promise<{ id: string }> }
  ) => {
    if (!context) {
      return NextResponse.json(
        { error: "Missing route context" },
        { status: 500 }
      );
    }
    try {
      const { id } = await context.params;

      const link = await prisma.paymentLink.findUnique({
        where: { id },
        include: { organization: { select: { name: true, id: true } } },
      });

      if (!link || link.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "Link no encontrado o inactivo" },
          { status: 404 }
        );
      }

      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return NextResponse.json({ error: "Link expirado" }, { status: 410 });
      }

      if (link.maxPayments && link.currentPayments >= link.maxPayments) {
        return NextResponse.json(
          { error: "Límite de pagos alcanzado" },
          { status: 410 }
        );
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rhynode-finance.vercel.app";

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: link.currency.toLowerCase(),
              product_data: {
                name: link.name,
                description: link.description || `Pago a ${link.organization.name}`,
              },
              unit_amount: Math.round(decimalToNumber(link.amount) * 100), // Stripe usa centavos
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${appUrl}/pay/${link.urlSlug}?success=true`,
        cancel_url: `${appUrl}/pay/${link.urlSlug}?canceled=true`,
        metadata: {
          paymentLinkId: link.id,
          organizationId: link.organizationId,
          type: "payment_link",
        },
      });

      return NextResponse.json({ url: session.url });
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }
  },
  { key: "checkout-stripe", maxRequests: 10, windowMs: 60000 }
);
