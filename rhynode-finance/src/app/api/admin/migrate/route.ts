import { NextResponse } from "next/server";
import { execSync } from "node:child_process";
import { logger } from "@/lib/logger";

const MIGRATE_SECRET = process.env.MIGRATE_SECRET;

export async function POST(request: Request) {
  // This route intentionally runs prisma migrate deploy against the production
  // database. It is protected by a secret so it can be triggered manually by
  // the team without exposing DATABASE_URL outside the runtime environment.
  if (!MIGRATE_SECRET) {
    return NextResponse.json(
      { error: "Migration secret not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  if (secret !== MIGRATE_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL is not set in this environment" },
        { status: 500 }
      );
    }

    const output = execSync("npx prisma migrate deploy", {
      cwd: process.cwd(),
      env: { ...process.env, PATH: process.env.PATH ?? "" },
      encoding: "utf-8",
      stdio: "pipe",
      timeout: 120_000,
    });

    return NextResponse.json({ ok: true, output: output.trim() });
  } catch (error) {
    logger.error("Admin migration failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : "Unknown error";
    const stderr =
      typeof error === "object" && error !== null && "stderr" in error
        ? String((error as { stderr?: unknown }).stderr)
        : "";
    return NextResponse.json(
      { error: "Migration failed", message, stderr },
      { status: 500 }
    );
  }
}
