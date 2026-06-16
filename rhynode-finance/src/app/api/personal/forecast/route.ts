import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/decimal";
import { getUserProfile, getOrCreateAuthOrg } from "@/lib/auth";
import {
  subMonths,
  startOfMonth,
  endOfMonth,
  format,
  addMonths,
} from "date-fns";
import { logger } from "@/lib/logger";
import {
  generateCashflowProjection,
  type HistoricalMonth,
  type RecurringTransactionInput,
} from "@/lib/cashflow-forecast";
import { z } from "zod";

const querySchema = z.object({
  months: z.coerce.number().min(3).max(60).default(12),
  includeAguinaldo: z.coerce.boolean().default(true),
  includePrima: z.coerce.boolean().default(true),
  includeIva: z.coerce.boolean().default(true),
});

function buildHistoricalMonths(
  transactions: Array<{ date: Date; type: string; amount: unknown }>,
  start: Date,
  end: Date
): HistoricalMonth[] {
  const monthlyMap = new Map<string, { income: number; expenses: number }>();

  for (const t of transactions) {
    if (t.date < start || t.date > end) continue;
    const key = format(t.date, "yyyy-MM");
    const bucket = monthlyMap.get(key) || { income: 0, expenses: 0 };
    const amount = decimalToNumber(t.amount as number);

    if (t.type === "INCOME") {
      bucket.income += amount;
    } else if (t.type === "EXPENSE") {
      bucket.expenses += Math.abs(amount);
    }

    monthlyMap.set(key, bucket);
  }

  const historical: HistoricalMonth[] = [];
  let cursor = start;
  while (cursor <= end) {
    const key = format(cursor, "yyyy-MM");
    const bucket = monthlyMap.get(key) || { income: 0, expenses: 0 };
    historical.push({ month: key, income: bucket.income, expenses: bucket.expenses });
    cursor = addMonths(cursor, 1);
  }

  return historical;
}

export async function GET(request: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getOrCreateAuthOrg();
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      months: searchParams.get("months"),
      includeAguinaldo: searchParams.get("aguinaldo"),
      includePrima: searchParams.get("prima"),
      includeIva: searchParams.get("iva"),
    });

    const params = parsed.success
      ? parsed.data
      : { months: 12, includeAguinaldo: true, includePrima: true, includeIva: true };

    const now = new Date();
    const historicalEnd = endOfMonth(subMonths(now, 1));
    const historicalStart = startOfMonth(subMonths(historicalEnd, 23));

    const [accounts, transactions, recurring, invoices] = await Promise.all([
      prisma.account.findMany({
        where: { userId: profile.id },
        select: { balance: true, currency: true },
      }),
      prisma.transaction.findMany({
        where: {
          organizationId: org.id,
          scope: "PERSONAL",
          date: { gte: historicalStart, lte: historicalEnd },
          OR: [{ userId: profile.id }, { userId: null }],
        },
        orderBy: { date: "asc" },
        select: { date: true, type: true, amount: true },
      }),
      prisma.recurringTransaction.findMany({
        where: {
          userId: profile.id,
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          amount: true,
          type: true,
          frequency: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      }),
      prisma.invoice.findMany({
        where: {
          organizationId: org.id,
          issueDate: { gte: subMonths(now, 12) },
        },
        select: { taxAmount: true, total: true, issueDate: true },
      }),
    ]);

    const currentBalance = accounts.reduce(
      (sum, account) => sum + decimalToNumber(account.balance),
      0
    );

    const historical = buildHistoricalMonths(
      transactions as Array<{ date: Date; type: string; amount: unknown }>,
      historicalStart,
      historicalEnd
    );

    const recurringInputs: RecurringTransactionInput[] = recurring.map((r) => ({
      id: r.id,
      name: r.name,
      amount: decimalToNumber(r.amount),
      type: r.type === "INCOME" ? "INCOME" : "EXPENSE",
      frequency: r.frequency,
      startDate: r.startDate,
      endDate: r.endDate,
      status: r.status,
    }));

    const hasInvoices = invoices.length > 0;
    const averageMonthlyIva = hasInvoices
      ? invoices.reduce((sum, inv) => sum + decimalToNumber(inv.taxAmount), 0) / 12
      : 0;

    const projection = generateCashflowProjection({
      currentBalance,
      historical,
      recurring: recurringInputs,
      monthsToProject: params.months,
      referenceDate: now,
      colombianEvents: {
        includeAguinaldo: params.includeAguinaldo,
        includePrima: params.includePrima,
        includeIvaBimestral: params.includeIva && hasInvoices,
        averageMonthlyIva,
      },
    });

    return NextResponse.json({
      ...projection,
      currency: accounts[0]?.currency ?? "COP",
      recurringCount: recurring.length,
      hasInvoices,
    });
  } catch (error) {
    logger.error("Failed to generate forecast", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to generate forecast" },
      { status: 500 }
    );
  }
}
