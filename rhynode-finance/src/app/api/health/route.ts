import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1 as ok`;

    return NextResponse.json({
      status: "ok",
      db: "connected",
    });
  } catch (err: unknown) {
    console.error("Health check error:", err);
    return NextResponse.json(
      {
        status: "error",
      },
      { status: 500 }
    );
  }
}
