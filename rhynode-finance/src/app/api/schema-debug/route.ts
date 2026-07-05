import { NextResponse } from "next/server";

export async function GET() {
  // This endpoint previously allowed Prisma schema introspection. It is now
  // intentionally disabled in every environment to avoid leaking schema details.
  // Returning 404 (instead of 401/403) keeps it indistinguishable from a
  // non-existent route and prevents path enumeration.
  return NextResponse.json(
    { error: "Endpoint disabled" },
    { status: 404 }
  );
}
