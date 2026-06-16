import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { logger } from "@/lib/logger";

export const GET = withRateLimit(
  async (
    request: Request,
    context?: { params: Promise<{ slug: string }> }
  ) => {
    if (!context) {
      return NextResponse.json(
        { error: "Missing route context" },
        { status: 500 }
      );
    }
    try {
      const { slug } = await context.params;

      const link = await prisma.paymentLink.findUnique({
        where: { urlSlug: slug },
        include: { organization: { select: { name: true, country: true } } },
      });

      if (!link || link.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "Link de cobro no encontrado o inactivo" },
          { status: 404 }
        );
      }

      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return NextResponse.json(
          { error: "Este link de cobro ha expirado" },
          { status: 410 }
        );
      }

      if (
        link.maxPayments &&
        link.currentPayments >= link.maxPayments
      ) {
        return NextResponse.json(
          { error: "Este link de cobro ha alcanzado su límite de pagos" },
          { status: 410 }
        );
      }

      return NextResponse.json({
        id: link.id,
        name: link.name,
        description: link.description,
        amount: link.amount,
        currency: link.currency,
        urlSlug: link.urlSlug,
        organizationName: link.organization.name,
        organizationCountry: link.organization.country,
        maxPayments: link.maxPayments,
        currentPayments: link.currentPayments,
      });
    } catch (error) {
      logger.error("Failed to fetch public payment link", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json(
        { error: "Failed to fetch payment link" },
        { status: 500 }
      );
    }
  },
  { key: "public-link", maxRequests: 30, windowMs: 60000 }
);