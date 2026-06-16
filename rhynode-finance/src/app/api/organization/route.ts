import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

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

export async function GET() {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ organization: org });
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const existing = await prisma.organization.findFirst({
      where: { slug: userId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Organization already exists" },
        { status: 409 }
      );
    }

    // Ensure UserProfile exists
    let profile = await prisma.userProfile.findUnique({
      where: { clerkId: userId },
    });

    if (!profile) {
      const email = session?.sessionClaims?.email as string | undefined;
      profile = await prisma.userProfile.create({
        data: {
          clerkId: userId,
          email: email || "",
          scope: parsed.data.scope ?? "PERSONAL",
          hasBusiness: parsed.data.hasBusiness ?? false,
          onboardingCompleted: parsed.data.onboardingCompleted ?? false,
        },
      });
    }

    const org = await prisma.organization.create({
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
    await prisma.userProfile.update({
      where: { id: profile.id },
      data: {
        scope: parsed.data.scope ?? profile.scope,
        hasBusiness: parsed.data.hasBusiness ?? profile.hasBusiness,
      },
    });

    // Create a default subscription record
    await prisma.subscription.create({
      data: {
        organizationId: org.id,
        plan: "STARTER",
        status: "TRIAL",
      },
    });

    return NextResponse.json({ organization: org }, { status: 201 });
  } catch (error) {
    console.error("Failed to create organization:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: parsed.data,
    });

    // Sync UserProfile if scope/hasBusiness changed
    if (parsed.data.scope !== undefined || parsed.data.hasBusiness !== undefined) {
      const profile = await prisma.userProfile.findUnique({
        where: { id: org.userId ?? undefined },
      });
      if (profile) {
        await prisma.userProfile.update({
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
    console.error("Failed to update organization:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}
