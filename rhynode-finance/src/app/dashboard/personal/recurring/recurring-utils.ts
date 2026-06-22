import {
  formatCurrency as fmtCurrency,
  formatDate as fmtDate,
} from "@/lib/format";
import type { Locale } from "@/lib/locale";

export interface RecurringItem {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  type: string;
  frequency: string;
  nextDueDate: string;
  isSubscription: boolean;
  provider: string | null;
  status: string;
  accountCurrency: string | null;
}

const FREQUENCY_LABELS: Record<Locale, Record<string, string>> = {
  es: {
    DAILY: "Diario",
    WEEKLY: "Semanal",
    BIWEEKLY: "Quincenal",
    MONTHLY: "Mensual",
    QUARTERLY: "Trimestral",
    YEARLY: "Anual",
  },
  en: {
    DAILY: "Daily",
    WEEKLY: "Weekly",
    BIWEEKLY: "Biweekly",
    MONTHLY: "Monthly",
    QUARTERLY: "Quarterly",
    YEARLY: "Yearly",
  },
};

const TYPE_LABELS: Record<Locale, Record<string, string>> = {
  es: { EXPENSE: "Gasto", INCOME: "Ingreso", TRANSFER: "Transferencia" },
  en: { EXPENSE: "Expense", INCOME: "Income", TRANSFER: "Transfer" },
};

export function formatCurrency(amount: number, currency: string, locale: Locale = "es") {
  return fmtCurrency(amount, currency, locale, { minimumFractionDigits: 0 });
}

export function formatDate(date: string | Date, locale: Locale = "es") {
  return fmtDate(date, locale, { day: "numeric", month: "short", year: "numeric" });
}

export function frequencyLabel(frequency: string, locale: Locale = "es") {
  return FREQUENCY_LABELS[locale][frequency] ?? frequency;
}

export function typeLabel(type: string, locale: Locale = "es") {
  return TYPE_LABELS[locale][type] ?? type;
}

export function typeBadgeVariant(type: string): "default" | "secondary" | "outline" | "destructive" {
  switch (type) {
    case "INCOME":
      return "default";
    case "EXPENSE":
      return "secondary";
    case "TRANSFER":
      return "outline";
    default:
      return "outline";
  }
}