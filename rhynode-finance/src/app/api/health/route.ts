import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1 as ok`;

    return NextResponse.json({
      status: "ok",
      db: "connected",
    });
  } catch (err: unknown) {
    logger.error("Health check error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      {
        status: "error",
      },
      { status: 500 }
    );
  }
}