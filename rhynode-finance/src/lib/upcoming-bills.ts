import { getPrisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/decimal";

export type BillKind = "debt" | "subscription" | "invoice" | "tax";

export interface UpcomingBill {
  id: string;
  kind: BillKind;
  title: string;
  subtitle?: string;
  amount: number;
  currency: string;
  dueDate: string;
  /** Days until due — negative means overdue. */
  daysUntilDue: number;
  overdue: boolean;
  href: string;
}

const FREQUENCY_DAYS: Record<string, number> = {
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 90,
  SEMESTER: 180,
  YEARLY: 365,
};

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Aggregates every upcoming financial obligation into a single timeline:
 * debts due, recurring subscriptions (next charge computed from last paid +
 * frequency), outstanding business invoices, and pending tax reports.
 * Sorted by due date ascending. Overdue items are kept (flagged) so the user
 * sees them first.
 */
export async function getUpcomingBills(
  userId: string,
  orgId: string | null,
  horizonDays = 60
): Promise<UpcomingBill[]> {
  const prisma = getPrisma();
  const now = new Date();
  const bills: UpcomingBill[] = [];

  // 1. Active debts with a due date (owed money).
  const debts = await prisma.debt.findMany({
    where: { userId, status: "ACTIVE", dueDate: { not: null } },
    select: { id: true, name: true, counterparty: true, remainingAmount: true, currency: true, dueDate: true },
  });
  for (const debt of debts) {
    if (!debt.dueDate) continue;
    const days = daysBetween(now, debt.dueDate);
    if (days > horizonDays) continue;
    bills.push({
      id: debt.id,
      kind: "debt",
      title: debt.name,
      subtitle: debt.counterparty ? `con ${debt.counterparty}` : undefined,
      amount: decimalToNumber(debt.remainingAmount),
      currency: debt.currency,
      dueDate: debt.dueDate.toISOString(),
      daysUntilDue: days,
      overdue: days < 0,
      href: "/dashboard/personal/debts",
    });
  }

  // 2. Active subscriptions — next charge computed from lastPaidAt + frequency.
  const subscriptions = await prisma.detectedSubscription.findMany({
    where: { userId, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      provider: true,
      amount: true,
      currency: true,
      frequency: true,
      lastPaidAt: true,
      lastDetectedAt: true,
    },
  });
  for (const sub of subscriptions) {
    const intervalDays = FREQUENCY_DAYS[sub.frequency] ?? 30;
    const anchor = sub.lastPaidAt ?? sub.lastDetectedAt;
    if (!anchor) continue;
    const nextDue = new Date(anchor.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    const days = daysBetween(now, nextDue);
    if (days > horizonDays) continue;
    bills.push({
      id: sub.id,
      kind: "subscription",
      title: sub.name,
      subtitle: sub.provider ?? undefined,
      amount: decimalToNumber(sub.amount),
      currency: sub.currency,
      dueDate: nextDue.toISOString(),
      daysUntilDue: days,
      overdue: days < 0,
      href: "/dashboard/personal/subscriptions",
    });
  }

  if (orgId) {
    // 3. Outstanding business invoices (money to collect), not paid, with a due date.
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        paidAt: null,
        dueDate: { not: null },
        status: { not: "DRAFT" },
      },
      select: { id: true, number: true, total: true, currency: true, dueDate: true, status: true },
    });
    for (const invoice of invoices) {
      if (!invoice.dueDate) continue;
      const days = daysBetween(now, invoice.dueDate);
      if (days > horizonDays) continue;
      bills.push({
        id: invoice.id,
        kind: "invoice",
        title: `Factura ${invoice.number}`,
        subtitle: invoice.status === "OVERDUE" ? "Vencida" : "Por cobrar",
        amount: decimalToNumber(invoice.total),
        currency: invoice.currency,
        dueDate: invoice.dueDate.toISOString(),
        daysUntilDue: days,
        overdue: days < 0,
        href: "/dashboard/invoices",
      });
    }

    // 4. Pending tax reports with a due date.
    const taxes = await prisma.taxReport.findMany({
      where: { organizationId: orgId, status: "PENDING", dueDate: { not: null } },
      select: { id: true, type: true, period: true, amount: true, dueDate: true },
    });
    for (const tax of taxes) {
      if (!tax.dueDate) continue;
      const days = daysBetween(now, tax.dueDate);
      if (days > horizonDays) continue;
      bills.push({
        id: tax.id,
        kind: "tax",
        title: `${tax.type} ${tax.period}`,
        subtitle: "Impuesto",
        amount: tax.amount ? decimalToNumber(tax.amount) : 0,
        currency: "COP",
        dueDate: tax.dueDate.toISOString(),
        daysUntilDue: days,
        overdue: days < 0,
        href: "/dashboard/tax",
      });
    }
  }

  return bills.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

export function formatDueLabel(daysUntilDue: number): string {
  if (daysUntilDue < 0) return `Vencida hace ${Math.abs(daysUntilDue)}d`;
  if (daysUntilDue === 0) return "Vence hoy";
  if (daysUntilDue === 1) return "Vence mañana";
  if (daysUntilDue <= 7) return `En ${daysUntilDue} días`;
  const date = new Date(Date.now() + daysUntilDue * 24 * 60 * 60 * 1000);
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}