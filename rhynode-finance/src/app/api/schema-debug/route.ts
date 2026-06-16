import { NextResponse } from "next/server";

export async function GET() {
  // Schema introspection endpoint disabled for security
  return NextResponse.json(
    { error: "Endpoint disabled" },
    { status: 404 }
  );
}
