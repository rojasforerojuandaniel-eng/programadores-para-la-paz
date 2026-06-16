import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();

    // Mark sent invoices as overdue if past due date
    const result = await prisma.invoice.updateMany({
      where: {
        status: "SENT",
        dueDate: { lt: now },
      },
      data: { status: "OVERDUE" },
    });

    return NextResponse.json({
      ok: true,
      invoicesMarkedOverdue: result.count,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error("Cron job failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}