import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();

    const [invoices, clients, taxes, banks] = await Promise.all([
      prisma.invoice.findMany({
        where: { organizationId: org.id },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.client.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.taxReport.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.bankAccount.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      org: { id: org.id, name: org.name, onboardingCompleted: org.onboardingCompleted },
      counts: {
        invoices: invoices.length,
        clients: clients.length,
        taxes: taxes.length,
        banks: banks.length,
      },
    });
  } catch (err: unknown) {
    console.error("Debug dashboard error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
