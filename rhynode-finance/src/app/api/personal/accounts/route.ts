import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";

const createSchema = z.object({
  name: z.string().min(1),
  type: z.string().default("CHECKING"),
  balance: z.number().default(0),
  currency: z.string().default("COP"),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const GET = withRateLimit(async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.account.findMany({
      where: { userId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    logger.error("Failed to fetch accounts", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});

export const POST = withRateLimit(async function POST(request: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
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

    const { name, type, balance, currency, color, icon } = parsed.data;

    const account = await prisma.account.create({
      data: {
        userId: profile.id,
        name,
        type,
        balance,
        currency,
        color,
        icon,
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    logger.error("Failed to create account", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});