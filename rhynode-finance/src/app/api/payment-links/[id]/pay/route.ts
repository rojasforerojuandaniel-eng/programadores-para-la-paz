import { NextResponse } from "next/server";

// This endpoint is intentionally DISABLED.
// Payment links must only be marked as paid by verified Stripe/Wompi webhooks,
// never by a public POST with no authentication or provider proof.
export async function POST() {
  return NextResponse.json(
    { error: "Use the provider checkout/webhook flow to complete payment" },
    { status: 403 }
  );
}
