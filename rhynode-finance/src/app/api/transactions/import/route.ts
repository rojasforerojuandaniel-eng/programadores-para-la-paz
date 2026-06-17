import { NextResponse } from "next/server";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { withRateLimit } from "@/lib/with-rate-limit";
import { getPrisma } from "@/lib/prisma";
import {
  parseBankFile,
  parseRows,
  detectDuplicates,
  validateFileType,
  type ExistingTransaction,
} from "@/lib/bank-import";
import { suggestCategory } from "@/lib/categorizer";
import { z } from "zod";
import { logger } from "@/lib/logger";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const confirmSchema = z.object({
  transactions: z.array(
    z.object({
      date: z.string().datetime(),
      description: z.string().min(1).max(500),
      amount: z.number().positive(),
      type: z.enum(["INCOME", "EXPENSE"]),
      bankAccountId: z.string().optional(),
      category: z.string().optional(),
      categoryId: z.string().optional(),
    })
  ),
});

export const POST = withRateLimit(
  async (request: Request) => {
    try {
      const org = await requireAuth();
      if (!org) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const profile = await getUserProfile();
      const scope = (profile?.scope ?? "PERSONAL") as "PERSONAL" | "BUSINESS";

      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File) || !file.name) {
        return NextResponse.json(
          { error: "Archivo requerido" },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "El archivo excede el límite de 2MB" },
          { status: 413 }
        );
      }

      if (!validateFileType(file.name, file.type)) {
        return NextResponse.json(
          { error: "Formato no soportado. Usa CSV, XLSX, XLS u ODS." },
          { status: 415 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const matrix = parseBankFile(buffer, file.name);
      const result = parseRows(matrix);

      if (result.parsedRows === 0) {
        return NextResponse.json(
          {
            error:
              "No se detectaron transacciones válidas. Revisa que el archivo tenga columnas de fecha, descripción y monto.",
            result: {
              ...result,
              rows: [],
            },
          },
          { status: 422 }
        );
      }

      const prisma = getPrisma();
      const existing = await prisma.transaction.findMany({
        where: { organizationId: org.id, scope },
        select: { id: true, date: true, amount: true, description: true },
      });

      const existingForDedup: ExistingTransaction[] = existing.map((tx) => ({
        id: tx.id,
        date: tx.date,
        amount: Number(tx.amount),
        description: tx.description,
      }));

      const rowsWithDuplicates = detectDuplicates(result.rows, existingForDedup);
      const duplicateCount = rowsWithDuplicates.filter((r) => r.duplicate).length;

      // Suggest categories for non-duplicates when no explicit category provided
      const rows = rowsWithDuplicates.map((row) => {
        if (row.duplicate) return row;
        const suggestion = suggestCategory(row.description, row.amount);
        return {
          ...row,
          suggestedCategory: suggestion.confidence >= 0.5 ? suggestion.category : undefined,
        };
      });

      return NextResponse.json({
        preview: {
          ...result,
          rows,
          duplicateCount,
        },
      });
    } catch (error) {
      logger.error("Failed to preview bank import", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Error al procesar el archivo",
        },
        { status: 500 }
      );
    }
  },
  { key: "bank-import-preview", maxRequests: 10, windowMs: 60000 }
);

export const PUT = withRateLimit(
  async (request: Request) => {
    try {
      const org = await requireAuth();
      if (!org) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const profile = await getUserProfile();
      const scope = (profile?.scope ?? "PERSONAL") as "PERSONAL" | "BUSINESS";

      const body = await request.json();
      const parsed = confirmSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { transactions } = parsed.data;

      if (transactions.length === 0) {
        return NextResponse.json(
          { error: "No hay transacciones para importar" },
          { status: 400 }
        );
      }

      const prisma = getPrisma();

      // Validate bank account ownership and collect unique accountIds
      const accountIds = new Set<string>();
      for (const tx of transactions) {
        if (tx.bankAccountId) accountIds.add(tx.bankAccountId);
      }

      if (accountIds.size > 0) {
        const accounts = await prisma.bankAccount.findMany({
          where: {
            id: { in: Array.from(accountIds) },
            organizationId: org.id,
          },
          select: { id: true },
        });
        const validAccountIds = new Set(accounts.map((a) => a.id));
        const invalid = transactions.find((tx) => tx.bankAccountId && !validAccountIds.has(tx.bankAccountId));
        if (invalid) {
          return NextResponse.json(
            { error: "Cuenta bancaria inválida" },
            { status: 400 }
          );
        }
      }

      // Build create data
      const createData = transactions.map((tx) => {
        const suggested = tx.category
          ? undefined
          : suggestCategory(tx.description, tx.amount);
        const category =
          tx.category ||
          (suggested && suggested.confidence >= 0.5 ? suggested.category : tx.type === "INCOME" ? "Ventas" : "Gastos");

        return {
          organizationId: org.id,
          userId: profile?.id ?? null,
          type: tx.type,
          category,
          categoryId: tx.categoryId,
          description: tx.description,
          amount: tx.amount,
          currency: org.currency,
          date: new Date(tx.date),
          bankAccountId: tx.bankAccountId,
          scope,
        };
      });

      const created = await prisma.$transaction(async (txClient) => {
        await txClient.transaction.createMany({
          data: createData,
        });

        // Update bank account balances
        const deltas = new Map<string, number>();
        for (const tx of createData) {
          if (!tx.bankAccountId) continue;
          const delta = tx.type === "INCOME" ? tx.amount : -tx.amount;
          deltas.set(tx.bankAccountId, (deltas.get(tx.bankAccountId) ?? 0) + delta);
        }

        for (const [accountId, delta] of deltas) {
          await txClient.bankAccount.update({
            where: { id: accountId, organizationId: org.id },
            data: { balance: { increment: delta } },
          });
        }

        return createData.length;
      });

      logger.info("Bank import completed", {
        organizationId: org.id,
        count: created,
        fileTransactions: transactions.length,
      });

      return NextResponse.json({
        success: true,
        imported: created,
      });
    } catch (error) {
      logger.error("Failed to confirm bank import", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Error al importar transacciones" },
        { status: 500 }
      );
    }
  },
  { key: "bank-import-confirm", maxRequests: 5, windowMs: 60000 }
);
