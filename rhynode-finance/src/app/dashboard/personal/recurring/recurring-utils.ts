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

const intlLocale = (locale: Locale): string => (locale === "en" ? "en-US" : "es-CO");

export function formatCurrency(amount: number, currency: string, locale: Locale = "es") {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date, locale: Locale = "es") {
  return new Date(date).toLocaleDateString(intlLocale(locale), {
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

export function typeLabel(type: string) {
  switch (type) {
    case "EXPENSE":
      return "Gasto";
    case "INCOME":
      return "Ingreso";
    case "TRANSFER":
      return "Transferencia";
    default:
      return type;
  }
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