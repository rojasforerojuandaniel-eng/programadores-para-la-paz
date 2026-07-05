import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";

const calculateSchema = z.object({
  type: z.enum(["IVA", "RETEFUENTE", "ICA"]),
  amount: z.number().min(0),
  city: z.string().optional(),
});

const ICA_RATES: Record<string, number> = {
  Bogotá: 0.00968,
  Medellín: 0.0085,
  Cali: 0.009,
  Barranquilla: 0.007,
};

function getReteFuenteRate(amount: number): number {
  if (amount <= 1_000_000) return 0;
  if (amount <= 5_000_000) return 0.01;
  if (amount <= 10_000_000) return 0.02;
  if (amount <= 50_000_000) return 0.03;
  return 0.04;
}

// Public, intentionally unauthenticated tax calculator. Rate-limited to prevent abuse.
export const POST = withRateLimit(async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = calculateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type, amount, city } = parsed.data;
    let taxRate = 0;
    let taxAmount = 0;

    if (type === "IVA") {
      taxRate = 0.19;
      taxAmount = amount * taxRate;
    } else if (type === "RETEFUENTE") {
      taxRate = getReteFuenteRate(amount);
      taxAmount = amount * taxRate;
    } else if (type === "ICA") {
      const cityKey = city || "";
      taxRate = ICA_RATES[cityKey] ?? 0.009;
      taxAmount = amount * taxRate;
    }

    const total = amount + taxAmount;

    return NextResponse.json({
      baseAmount: amount,
      taxRate,
      taxAmount,
      total,
    });
  } catch (error) {
    logger.error("Failed to calculate tax", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to calculate tax" },
      { status: 500 }
    );
  }
}, {"maxRequests": 100,"windowMs": 60000});