import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const MIGRATE_SECRET = process.env.MIGRATE_SECRET;
const MIGRATION_NAME = "20250710000000_add_ai_conversation_history";
const MIGRATION_DIR = join(process.cwd(), "prisma", "migrations", MIGRATION_NAME);

export async function POST(request: Request) {
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

    const sqlPath = join(MIGRATION_DIR, "migration.sql");
    const rawSql = readFileSync(sqlPath, "utf-8");

    const alreadyApplied = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM _prisma_migrations WHERE migration_name = ${MIGRATION_NAME}
    `;

    if (alreadyApplied[0]?.count && Number(alreadyApplied[0].count) > 0) {
      return NextResponse.json({ ok: true, output: "Migration already applied" });
    }

    const statements = rawSql
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const errors: string[] = [];
    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(`${statement};`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isDuplicate =
          message.includes("42P07") ||
          message.includes("42710") ||
          message.includes("already exists");
        if (!isDuplicate) {
          throw error;
        }
        errors.push(`Skipped (already exists): ${statement.slice(0, 60)}...`);
      }
    }

    const checksum = await computeChecksum(rawSql);
    const migrationId = randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO _prisma_migrations (
        id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
      ) VALUES (
        '${migrationId}', '${checksum}', NOW(), '${MIGRATION_NAME}', '', NULL, NOW(), 1
      )
    `);

    return NextResponse.json({
      ok: true,
      output: `Migration ${MIGRATION_NAME} applied.${errors.length ? ` Skipped ${errors.length} duplicate object(s).` : ""}`,
      skipped: errors,
    });
  } catch (error) {
    logger.error("Admin migration failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Migration failed", message },
      { status: 500 }
    );
  }
}

async function computeChecksum(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
