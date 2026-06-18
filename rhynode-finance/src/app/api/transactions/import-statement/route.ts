import { getUserProfile, getOrCreateAuthOrg } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { parseStatement, type BankType } from "@/lib/bank-statement-parser";
import { findDuplicates } from "@/lib/transaction-dedup";
import { z } from "zod";

const bodySchema = z.object({
  csv: z.string().min(1).max(2_000_000),
  bank: z.enum(["bancolombia", "davivienda", "nequi", "auto"]).default("auto"),
  /** If true, returns only a preview (parsed + dedup flags) without inserting. */
  preview: z.boolean().default(true),
});

export const POST = withRateLimit(
  async (request: Request) => {
    const profile = await getUserProfile();
    if (!profile) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { csv, bank, preview } = parsed.data;
    const statement = parseStatement(csv, bank as BankType);

    // Fetch existing transactions in the statement's date range to dedup against.
    const prisma = getPrisma();
    const org = await getOrCreateAuthOrg().catch(() => null);
    const dates = statement.rows.map((r) => r.date).sort();
    let existing: { amount: number; description: string; date: string }[] = [];
    if (dates.length > 0) {
      const start = new Date(`${dates[0]}T00:00:00Z`);
      const end = new Date(`${dates[dates.length - 1]}T23:59:59Z`);
      const where = {
        date: { gte: start, lte: end },
        ...(org ? { organizationId: org.id } : { userId: profile.id }),
      };
      const rows = await prisma.transaction.findMany({
        where,
        select: { amount: true, description: true, date: true },
      });
      existing = rows.map((r) => ({
        amount: Number(r.amount),
        description: r.description,
        date: r.date.toISOString(),
      }));
    }

    const dupMatches = findDuplicates(
      statement.rows.map((r) => ({ amount: r.amount, description: r.description, date: r.date })),
      existing
    );
    const duplicateIndices = new Set(dupMatches.map((m) => m.index));

    const rows = statement.rows.map((row, index) => ({
      ...row,
      isDuplicate: duplicateIndices.has(index),
    }));

    return Response.json({
      bank: statement.bank,
      detectedBank: statement.bank,
      totalParsed: statement.rows.length,
      skipped: statement.skipped,
      duplicates: duplicateIndices.size,
      newCount: statement.rows.length - duplicateIndices.size,
      rows,
      preview,
      // When preview=false callers should use the returned rows to insert via
      // the standard /api/transactions endpoint (kept out of scope here to
      // avoid a large unchecked insert).
    });
  },
  { key: "import-statement", maxRequests: 10, windowMs: 60000 }
);