import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/decimal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { cn } from "@/lib/utils";
import { startOfDay, addDays, format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale/es";
import {
  CreditCard,
  Repeat,
  Target,
  FileText,
  Scale,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

type CalendarEventType = "debt" | "recurring" | "goal" | "invoice" | "tax";

type EventStatus = "upcoming" | "overdue" | "paid";

interface CalendarEvent {
  id: string;
  referenceId: string;
  type: CalendarEventType;
  title: string;
  date: Date;
  status: string;
  amount: number;
  currency: string;
  description: string;
}

interface UpcomingEventsWidgetProps {
  userId: string | undefined;
  orgId: string;
  currency: string;
}

const typeConfig: Record<
  CalendarEventType,
  { label: string; icon: React.ElementType; color: string; href: string }
> = {
  debt: {
    label: "Deuda",
    icon: CreditCard,
    color: "bg-rose-500/15 text-rose-500 border-rose-500/20",
    href: "/dashboard/personal/debts",
  },
  recurring: {
    label: "Recurrente",
    icon: Repeat,
    color: "bg-blue-500/15 text-blue-500 border-blue-500/20",
    href: "/dashboard/personal/recurring",
  },
  goal: {
    label: "Meta",
    icon: Target,
    color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
    href: "/dashboard/personal/goals",
  },
  invoice: {
    label: "Factura",
    icon: FileText,
    color: "bg-violet-500/15 text-violet-500 border-violet-500/20",
    href: "/dashboard/invoices",
  },
  tax: {
    label: "Impuesto",
    icon: Scale,
    color: "bg-amber-500/15 text-amber-500 border-amber-500/20",
    href: "/dashboard/tax",
  },
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getDisplayStatus(event: CalendarEvent): EventStatus {
  const isPaid =
    (event.type === "debt" && event.status === "PAID") ||
    (event.type === "invoice" && event.status === "PAID") ||
    (event.type === "tax" && event.status === "FILED") ||
    (event.type === "goal" && event.status === "COMPLETED");
  if (isPaid) return "paid";
  return event.date < startOfDay(new Date()) ? "overdue" : "upcoming";
}

function getStatusConfig(status: EventStatus) {
  switch (status) {
    case "paid":
      return {
        label: "Pagado",
        className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        icon: CheckCircle2,
      };
    case "overdue":
      return {
        label: "Vencido",
        className: "bg-rose-500/10 text-rose-600 border-rose-500/20",
        icon: AlertTriangle,
      };
    default:
      return {
        label: "Próximo",
        className: "bg-slate-500/10 text-slate-600 border-slate-500/20",
        icon: Clock,
      };
  }
}

function formatRelativeDate(date: Date) {
  const today = startOfDay(new Date());
  const days = differenceInDays(startOfDay(date), today);

  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days > 1 && days <= 7) return `En ${days} días`;

  return format(date, "d MMM", { locale: es });
}

const MAX_EVENTS = 7;
const LOOKAHEAD_DAYS = 90;

export async function UpcomingEventsWidget({
  userId,
  orgId,
  currency,
}: UpcomingEventsWidgetProps) {
  if (!userId) return null;

  const prisma = getPrisma();
  const now = new Date();
  const fromDate = startOfDay(now);
  const toDate = addDays(fromDate, LOOKAHEAD_DAYS);

  const [debts, recurring, goals, invoices, taxReports] = await Promise.all([
    prisma.debt.findMany({
      where: {
        userId,
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
        userId,
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
        userId,
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
        organizationId: orgId,
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
        organizationId: orgId,
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
  ]);

  const events: CalendarEvent[] = [
    ...debts.flatMap((d) => {
      if (!d.dueDate) return [];
      return {
        id: `debt-${d.id}`,
        referenceId: d.id,
        type: "debt" as const,
        title: d.name,
        date: d.dueDate,
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
      date: r.nextDueDate,
      status: r.status,
      amount: decimalToNumber(r.amount),
      currency,
      description: r.type === "INCOME" ? "Ingreso recurrente" : "Pago recurrente",
    })),
    ...goals.flatMap((g) => {
      if (!g.deadline) return [];
      return {
        id: `goal-${g.id}`,
        referenceId: g.id,
        type: "goal" as const,
        title: g.name,
        date: g.deadline,
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
        date: inv.dueDate,
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
        date: t.dueDate,
        status: t.status,
        amount: decimalToNumber(t.amount),
        currency,
        description: `Periodo ${t.period} ${t.year}`,
      };
    }),
  ];

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  const upcoming = events.slice(0, MAX_EVENTS);

  return (
    <Card className="surface-elevated-2">
      <CardHeader>
        <CardTitle className="heading-card flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Vencimientos próximos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <EmptyStateCard
            variant="sm"
            className="border-0 bg-transparent shadow-none"
            icon={Calendar}
            title="Sin vencimientos próximos"
            description="Aquí verás deudas, facturas, metas, impuestos y pagos recurrentes que vencen en los próximos días."
            hint="Crea una deuda, meta o factura para empezar."
          />
        ) : (
          <ul className="space-y-3" role="list" aria-label="Próximos vencimientos">
            {upcoming.map((event) => {
              const cfg = typeConfig[event.type];
              const Icon = cfg.icon;
              const status = getDisplayStatus(event);
              const statusCfg = getStatusConfig(status);
              const StatusIcon = statusCfg.icon;

              return (
                <li key={event.id}>
                  <Link
                    href={cfg.href}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`${event.title}, ${cfg.label}, vence ${formatRelativeDate(
                      event.date
                    )}, ${statusCfg.label}`}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                        cfg.color
                      )}
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{event.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={statusCfg.className}>
                          <StatusIcon className="h-3 w-3" />
                          <span>{statusCfg.label}</span>
                        </Badge>
                        <Badge variant="outline" className={cn("gap-1", cfg.color)}>
                          <Icon className="h-3 w-3" />
                          <span>{cfg.label}</span>
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {event.description}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(event.amount, event.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeDate(event.date)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
