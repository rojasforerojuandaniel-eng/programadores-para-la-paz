import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { logger } from "@/lib/logger";

const validTypes = ["debt", "invoice", "tax"] as const;

type EventType = (typeof validTypes)[number];

function parseEventId(compositeId: string): { type: EventType; id: string } | null {
  const idx = compositeId.indexOf("-");
  if (idx <= 0) return null;
  const type = compositeId.slice(0, idx);
  const id = compositeId.slice(idx + 1);
  if (!validTypes.includes(type as EventType)) return null;
  return { type: type as EventType, id };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const org = await requireAuth();
    const profile = await getUserProfile();
    if (!org || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const parsed = parseEventId(id);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const { type, id: referenceId } = parsed;
    const now = new Date();

    if (type === "debt") {
      const debt = await prisma.debt.findFirst({
        where: { id: referenceId, userId: profile.id },
      });
      if (!debt) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const updated = await prisma.debt.update({
        where: { id: referenceId },
        data: { status: "PAID", remainingAmount: 0 },
      });
      return NextResponse.json({ success: true, type, reference: updated });
    }

    if (type === "invoice") {
      const invoice = await prisma.invoice.findFirst({
        where: { id: referenceId, organizationId: org.id },
      });
      if (!invoice) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const updated = await prisma.invoice.update({
        where: { id: referenceId },
        data: { status: "PAID", paidAt: now },
      });
      return NextResponse.json({ success: true, type, reference: updated });
    }

    // tax
    const tax = await prisma.taxReport.findFirst({
      where: { id: referenceId, organizationId: org.id },
    });
    if (!tax) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const updated = await prisma.taxReport.update({
      where: { id: referenceId },
      data: { status: "FILED", filedAt: now },
    });
    return NextResponse.json({ success: true, type, reference: updated });
  } catch (error) {
    logger.error("Failed to mark calendar event as paid", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to mark event as paid" },
      { status: 500 }
    );
  }
}
