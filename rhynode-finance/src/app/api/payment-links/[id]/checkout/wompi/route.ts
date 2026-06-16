import { decimalToNumber } from "@/lib/decimal";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { logger } from "@/lib/logger";

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

      const wompiPublicKey = process.env.WOMPI_PUBLIC_KEY;
      if (!wompiPublicKey) {
        return NextResponse.json(
          { error: "Wompi no está configurado" },
          { status: 503 }
        );
      }

      // Build Wompi payment link URL
      // Format: https://checkout.wompi.co/p/?public-key=KEY&currency=COP&amount-in-cents=10000
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rhynode-finance.vercel.app";
      const amountInCents = Math.round(decimalToNumber(link.amount) * 100);
      const reference = `rhynode_${link.urlSlug}_${Date.now()}`;

      // Store pending reference in DB for webhook validation
      await prisma.paymentLink.update({
        where: { id: link.id },
        data: {
          config: {
            ...(typeof link.config === "object" && link.config !== null ? link.config : {}),
            wompiReference: reference,
            wompiPending: true,
          },
        },
      });

      const wompiUrl = new URL("https://checkout.wompi.co/p/");
      wompiUrl.searchParams.set("public-key", wompiPublicKey);
      wompiUrl.searchParams.set("currency", link.currency);
      wompiUrl.searchParams.set("amount-in-cents", amountInCents.toString());
      wompiUrl.searchParams.set("reference", reference);
      wompiUrl.searchParams.set(
        "redirect-url",
        `${appUrl}/pay/${link.urlSlug}?wompi=success`
      );

      return NextResponse.json({ url: wompiUrl.toString(), reference });
    } catch (error) {
      logger.error("Failed to create Wompi checkout", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to create Wompi checkout" },
        { status: 500 }
      );
    }
  },
  { key: "checkout-wompi", maxRequests: 10, windowMs: 60000 }
);