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

export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date) {
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
