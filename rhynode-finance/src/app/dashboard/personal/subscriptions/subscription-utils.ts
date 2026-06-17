import type { Transaction, DetectedSubscription } from "@/generated/prisma/client";

export interface SubscriptionItem {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  frequency: string;
  provider: string | null;
  category: string | null;
  status: string;
  lastPaidAt: string | null;
  lastDetectedAt: string;
  increased: boolean;
  unused: boolean;
  matched: boolean;
  nextRenewal: string | null;
  daysRemaining: number | null;
}

export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function frequencyLabel(frequency: string) {
  switch (frequency) {
    case "DAILY":
      return "Diario";
    case "WEEKLY":
      return "Semanal";
    case "BIWEEKLY":
      return "Quincenal";
    case "MONTHLY":
      return "Mensual";
    case "QUARTERLY":
      return "Trimestral";
    case "YEARLY":
      return "Anual";
    default:
      return frequency;
  }
}

export function monthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case "DAILY":
      return amount * 30;
    case "WEEKLY":
      return amount * 4.345;
    case "BIWEEKLY":
      return amount * 2;
    case "MONTHLY":
      return amount;
    case "QUARTERLY":
      return amount / 3;
    case "YEARLY":
      return amount / 12;
    default:
      return amount;
  }
}

export function yearlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case "DAILY":
      return amount * 365;
    case "WEEKLY":
      return amount * 52.143;
    case "BIWEEKLY":
      return amount * 26;
    case "MONTHLY":
      return amount * 12;
    case "QUARTERLY":
      return amount * 4;
    case "YEARLY":
      return amount;
    default:
      return amount * 12;
  }
}


export function subtractFrequency(date: Date, frequency: string): Date {
  const prev = new Date(date);
  switch (frequency) {
    case "DAILY":
      prev.setDate(prev.getDate() - 1);
      break;
    case "WEEKLY":
      prev.setDate(prev.getDate() - 7);
      break;
    case "BIWEEKLY":
      prev.setDate(prev.getDate() - 14);
      break;
    case "MONTHLY":
      prev.setMonth(prev.getMonth() - 1);
      break;
    case "QUARTERLY":
      prev.setMonth(prev.getMonth() - 3);
      break;
    case "YEARLY":
      prev.setFullYear(prev.getFullYear() - 1);
      break;
    default:
      prev.setMonth(prev.getMonth() - 1);
  }
  return prev;
}

export function addFrequency(date: Date, frequency: string): Date {
  const next = new Date(date);
  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "BIWEEKLY":
      next.setDate(next.getDate() + 14);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export function daysSince(date: Date | string | null): number {
  if (!date) return Infinity;
  return Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\d+/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildTransactionIndex(transactions: Transaction[]) {
  const index = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const key = normalizeText(tx.description);
    if (!key) continue;
    const list = index.get(key) || [];
    list.push(tx);
    index.set(key, list);
  }
  return index;
}

export function detectPriceIncrease(
  subscription: DetectedSubscription,
  transactionsByDescription: Map<string, Transaction[]>
): boolean {
  const key = normalizeText(subscription.description || subscription.name);
  if (!key) return false;
  const txs = transactionsByDescription.get(key) || [];
  if (txs.length < 2) return false;
  const sorted = [...txs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const last = Number(sorted[0].amount);
  const prev = Number(sorted[1].amount);
  return last > prev;
}


export function daysUntil(date: string | Date | null): number | null {
  if (!date) return null;
  const target = new Date(date);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function detectAmountMatch(
  subscription: DetectedSubscription,
  transactions: Transaction[]
): boolean {
  if (!transactions.length) return false;
  const subAmount = Number(subscription.amount);
  if (!Number.isFinite(subAmount) || subAmount === 0) return false;
  const threshold = subAmount * 0.2;
  return transactions.some((tx) => {
    const txAmount = Number(tx.amount);
    return Math.abs(txAmount - subAmount) <= threshold;
  });
}

export function getOccurrencesInRange(
  lastPaidAt: Date,
  frequency: string,
  from: Date,
  to: Date
): Date[] {
  let current = addFrequency(new Date(lastPaidAt), frequency);
  while (current < from) {
    current = addFrequency(current, frequency);
  }
  const dates: Date[] = [];
  while (current <= to) {
    dates.push(new Date(current));
    current = addFrequency(current, frequency);
  }
  return dates;
}

export function computeSubscriptionMeta(
  subscription: DetectedSubscription,
  transactionsByDescription: Map<string, Transaction[]>,
  allTransactions: Transaction[]
): Pick<SubscriptionItem, "increased" | "unused" | "matched" | "nextRenewal" | "daysRemaining"> {
  const increased = detectPriceIncrease(subscription, transactionsByDescription);
  const unused = daysSince(subscription.lastPaidAt) > 45;
  const matched = detectAmountMatch(subscription, allTransactions);
  const nextRenewal = subscription.lastPaidAt
    ? addFrequency(new Date(subscription.lastPaidAt), subscription.frequency).toISOString()
    : null;
  const daysRemaining = nextRenewal ? daysUntil(nextRenewal) : null;

  return { increased, unused, matched, nextRenewal, daysRemaining };
}

export function statusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Activa";
    case "PENDING_CANCELLATION":
      return "Para cancelar";
    case "CANCELED":
    case "CANCELLED":
      return "Cancelada";
    default:
      return status;
  }
}
