import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrganization } from "@/lib/organization.server";
import { canAdmin } from "@/lib/organization";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  taxId: z.string().optional(),
  country: z.enum(["CO", "MX", "BR", "AR", "CL", "PE"]).optional(),
  currency: z.enum(["COP", "MXN", "BRL", "ARS", "CLP", "PEN", "USD"]).optional(),
  timezone: z.string().optional(),
  onboardingCompleted: z.boolean().optional(),
  scope: z.enum(["PERSONAL", "BUSINESS", "BOTH"]).optional(),
  hasBusiness: z.boolean().optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  taxId: z.string().optional(),
  country: z.enum(["CO", "MX", "BR", "AR", "CL", "PE"]).optional(),
  currency: z.enum(["COP", "MXN", "BRL", "ARS", "CLP", "PEN", "USD"]).optional(),
  timezone: z.string().optional(),
  onboardingCompleted: z.boolean().optional(),
  scope: z.enum(["PERSONAL", "BUSINESS", "BOTH"]).optional(),
  hasBusiness: z.boolean().optional(),
});

export const GET = withRateLimit(async function GET() {
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
    return NextResponse.json({ organization: ctx.org });
  } catch (error) {
    logger.error("Failed to fetch organization", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});

export const POST = withRateLimit(async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.userId;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await getPrisma().organization.findFirst({
      where: { slug: userId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Organization already exists" },
        { status: 409 }
      );
    }

    // Ensure UserProfile exists
    let profile = await getPrisma().userProfile.findUnique({
      where: { clerkId: userId },
    });

    if (!profile) {
      const email = session?.sessionClaims?.email as string | undefined;
      profile = await getPrisma().userProfile.create({
        data: {
          clerkId: userId,
          email: email || "",
          scope: parsed.data.scope ?? "PERSONAL",
          hasBusiness: parsed.data.hasBusiness ?? false,
          onboardingCompleted: parsed.data.onboardingCompleted ?? false,
        },
      });
    }

    const org = await getPrisma().organization.create({
      data: {
        name: parsed.data.name,
        slug: userId,
        taxId: parsed.data.taxId,
        country: parsed.data.country ?? "CO",
        currency: parsed.data.currency ?? "COP",
        timezone: parsed.data.timezone ?? "America/Bogota",
        onboardingCompleted: parsed.data.onboardingCompleted ?? false,
        scope: parsed.data.scope ?? "PERSONAL",
        hasBusiness: parsed.data.hasBusiness ?? false,
        userId: profile.id,
      },
    });

    // Update UserProfile scope
    await getPrisma().userProfile.update({
      where: { id: profile.id },
      data: {
        scope: parsed.data.scope ?? profile.scope,
        hasBusiness: parsed.data.hasBusiness ?? profile.hasBusiness,
      },
    });

    // Create a default subscription record
    await getPrisma().subscription.create({
      data: {
        organizationId: org.id,
        plan: "STARTER",
        status: "TRIAL",
      },
    });

    return NextResponse.json({ organization: org }, { status: 201 });
  } catch (error) {
    logger.error("Failed to create organization", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});

export const PUT = withRateLimit(async function PUT(request: Request) {
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

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await getPrisma().organization.update({
      where: { id: ctx.org.id },
      data: parsed.data,
    });

    // Sync UserProfile if scope/hasBusiness changed
    if (parsed.data.scope !== undefined || parsed.data.hasBusiness !== undefined) {
      const profile = await getPrisma().userProfile.findUnique({
        where: { id: ctx.org.userId ?? undefined },
      });
      if (profile) {
        await getPrisma().userProfile.update({
          where: { id: profile.id },
          data: {
            scope: parsed.data.scope ?? profile.scope,
            hasBusiness: parsed.data.hasBusiness ?? profile.hasBusiness,
            onboardingCompleted: parsed.data.onboardingCompleted ?? profile.onboardingCompleted,
          },
        });
      }
    }

    return NextResponse.json({ organization: updated });
  } catch (error) {
    logger.error("Failed to update organization", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});