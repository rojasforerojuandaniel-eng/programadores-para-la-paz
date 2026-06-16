import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/subscription";

export async function GET() {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sub = await prisma.subscription.findUnique({
      where: { organizationId: org.id },
    });

    const planName = (sub?.plan as keyof typeof PLANS) || "STARTER";
    const plan = PLANS[planName];

    const invoiceCount = await prisma.invoice.count({
      where: { organizationId: org.id },
    });

    return NextResponse.json({
      plan: {
        name: plan.name,
        invoicesUsed: invoiceCount,
        invoicesLimit: plan.limits.invoices,
        usersUsed: 1,
        usersLimit: plan.limits.users,
      },
    });
  } catch (error) {
    console.error("Failed to fetch plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
}
