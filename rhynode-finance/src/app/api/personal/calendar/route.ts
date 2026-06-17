import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { decimalToNumber } from "@/lib/decimal";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { startOfMonth, endOfMonth } from "date-fns";
import { getOccurrencesInRange } from "@/app/dashboard/personal/subscriptions/subscription-utils";
import { withRateLimit } from "@/lib/with-rate-limit";

const querySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

type CalendarEventType = "debt" | "recurring" | "goal" | "invoice" | "tax" | "subscription";

interface CalendarEvent {
  id: string;
  referenceId: string;
  type: CalendarEventType;
  title: string;
  date: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  meta?: Record<string, unknown>;
}

export const GET = withRateLimit(async function GET(request: Request) {
  try {
    const org = await requireAuth();
    const profile = await getUserProfile();
    if (!org || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query params", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const now = new Date();
    const fromDate = parsed.data.from ?? startOfMonth(now);
    const toDate = parsed.data.to ?? endOfMonth(now);

    const [debts, recurring, goals, invoices, taxReports, subscriptions] = await Promise.all([
      prisma.debt.findMany({
        where: {
          userId: profile.id,
          dueDate: { not: null, gte: fromDate, lte: toDate },
        },
        select: {
          id: true,
          name: true,
          dueDate: true,
          remainingAmount: true,
          currency: true,
          status: true,
          counterparty: true,
        },
      }),
      prisma.recurringTransaction.findMany({
        where: {
          userId: profile.id,
          status: "ACTIVE",
          nextDueDate: { gte: fromDate, lte: toDate },
        },
        select: {
          id: true,
          name: true,
          nextDueDate: true,
          amount: true,
          type: true,
          status: true,
        },
      }),
      prisma.goal.findMany({
        where: {
          userId: profile.id,
          deadline: { not: null, gte: fromDate, lte: toDate },
        },
        select: {
          id: true,
          name: true,
          deadline: true,
          targetAmount: true,
          currentAmount: true,
          currency: true,
          status: true,
        },
      }),
      prisma.invoice.findMany({
        where: {
          organizationId: org.id,
          dueDate: { not: null, gte: fromDate, lte: toDate },
          status: { not: "CANCELLED" },
        },
        select: {
          id: true,
          number: true,
          dueDate: true,
          total: true,
          currency: true,
          status: true,
          client: { select: { name: true } },
        },
      }),
      prisma.taxReport.findMany({
        where: {
          organizationId: org.id,
          dueDate: { not: null, gte: fromDate, lte: toDate },
        },
        select: {
          id: true,
          authority: true,
          type: true,
          period: true,
          year: true,
          dueDate: true,
          amount: true,
          status: true,
        },
      }),
      prisma.detectedSubscription.findMany({
        where: {
          userId: profile.id,
          status: { not: "CANCELLED" },
          lastPaidAt: { not: null },
        },
        select: {
          id: true,
          name: true,
          lastPaidAt: true,
          amount: true,
          currency: true,
          frequency: true,
          provider: true,
          status: true,
        },
      }),
    ]);

    const events: CalendarEvent[] = [
      ...debts.flatMap((d) => {
        if (!d.dueDate) return [];
        return {
          id: `debt-${d.id}`,
          referenceId: d.id,
          type: "debt" as const,
          title: d.name,
          date: d.dueDate.toISOString(),
          status: d.status,
          amount: decimalToNumber(d.remainingAmount),
          currency: d.currency,
          description: d.counterparty
            ? `Deuda con ${d.counterparty}`
            : "Vencimiento de deuda",
        };
      }),
      ...recurring.map((r) => ({
        id: `recurring-${r.id}`,
        referenceId: r.id,
        type: "recurring" as const,
        title: r.name,
        date: r.nextDueDate.toISOString(),
        status: r.status,
        amount: decimalToNumber(r.amount),
        currency: org.currency,
        description: r.type === "INCOME" ? "Ingreso recurrente" : "Pago recurrente",
      })),
      ...goals.flatMap((g) => {
        if (!g.deadline) return [];
        return {
          id: `goal-${g.id}`,
          referenceId: g.id,
          type: "goal" as const,
          title: g.name,
          date: g.deadline.toISOString(),
          status: g.status,
          amount: decimalToNumber(g.targetAmount),
          currency: g.currency,
          description: `Meta: ${formatCurrency(
            decimalToNumber(g.currentAmount),
            g.currency
          )} de ${formatCurrency(decimalToNumber(g.targetAmount), g.currency)}`,
        };
      }),
      ...invoices.flatMap((inv) => {
        if (!inv.dueDate) return [];
        return {
          id: `invoice-${inv.id}`,
          referenceId: inv.id,
          type: "invoice" as const,
          title: `Factura ${inv.number}`,
          date: inv.dueDate.toISOString(),
          status: inv.status,
          amount: decimalToNumber(inv.total),
          currency: inv.currency,
          description: `Cliente: ${inv.client?.name ?? "—"}`,
        };
      }),
      ...taxReports.flatMap((t) => {
        if (!t.dueDate) return [];
        return {
          id: `tax-${t.id}`,
          referenceId: t.id,
          type: "tax" as const,
          title: `${t.authority} ${t.type}`,
          date: t.dueDate.toISOString(),
          status: t.status,
          amount: decimalToNumber(t.amount),
          currency: org.currency,
          description: `Periodo ${t.period} ${t.year}`,
        };
      }),
      ...subscriptions.flatMap((s) => {
        if (!s.lastPaidAt) return [];
        const dates = getOccurrencesInRange(s.lastPaidAt, s.frequency, fromDate, toDate);
        return dates.map((date, idx) => ({
          id: `subscription-${s.id}-${idx}`,
          referenceId: s.id,
          type: "subscription" as const,
          title: s.name,
          date: date.toISOString(),
          status: s.status,
          amount: decimalToNumber(s.amount),
          currency: s.currency,
          description: s.provider ? `Suscripción: ${s.provider}` : "Suscripción recurrente",
        }));
      }),
    ];

    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ events, from: fromDate.toISOString(), to: toDate.toISOString() });
  } catch (error) {
    logger.error("Failed to fetch calendar events", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
