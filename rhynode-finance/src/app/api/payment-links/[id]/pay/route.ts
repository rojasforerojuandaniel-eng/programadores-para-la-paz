import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/with-rate-limit";

// This endpoint is intentionally DISABLED.
// Payment links must only be marked as paid by verified Stripe/Wompi webhooks,
// never by a public POST with no authentication or provider proof.
export const POST = withRateLimit(async function POST() {
  return NextResponse.json(
    { error: "Use the provider checkout/webhook flow to complete payment" },
    { status: 403 }
  );
}, {"maxRequests": 100,"windowMs": 60000});
