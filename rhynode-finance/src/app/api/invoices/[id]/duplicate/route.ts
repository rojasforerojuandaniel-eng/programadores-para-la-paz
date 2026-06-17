import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { checkPlanLimit } from "@/lib/subscription";
import { duplicateInvoice } from "@/lib/invoices";
import { logger } from "@/lib/logger";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitCheck = await checkPlanLimit(org.id, "invoices");
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Límite de facturas alcanzado",
          message: `Tu plan permite ${limitCheck.limit} facturas. Actualiza tu plan para crear más.`,
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const invoice = await duplicateInvoice(org.id, id);

    return NextResponse.json({ invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "Invoice not found") {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }
    logger.error("Failed to duplicate invoice", { error: message });
    return NextResponse.json(
      { error: "Failed to duplicate invoice" },
      { status: 500 }
    );
  }
}
