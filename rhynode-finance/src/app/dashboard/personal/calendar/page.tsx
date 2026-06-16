import { decimalToNumber } from "@/lib/decimal";
import { getPrisma } from "@/lib/prisma";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { Calendar, CreditCard, Repeat, Target, PiggyBank } from "lucide-react";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function getWeekStart(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: "debt" | "recurring" | "goal" | "budget";
  amount?: number;
  currency?: string;
  description?: string;
}

export default async function CalendarPage() {
  const org = await requireAuth();
  if (!org) redirect("/sign-in");

  const profile = await getUserProfile();
  const userId = profile?.id;

  const prisma = getPrisma();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

  let events: CalendarEvent[] = [];

  if (userId) {
    const [debts, recurring, goals, budgets] = await Promise.all([
      prisma.debt.findMany({
        where: { userId, status: "ACTIVE", dueDate: { gte: monthStart, lte: monthEnd } },
        select: { id: true, name: true, dueDate: true, remainingAmount: true, currency: true },
      }),
      prisma.recurringTransaction.findMany({
        where: { userId, status: "ACTIVE", nextDueDate: { gte: monthStart, lte: monthEnd } },
        select: { id: true, name: true, nextDueDate: true, amount: true },
      }),
      prisma.goal.findMany({
        where: { userId, status: "ACTIVE", deadline: { gte: monthStart, lte: monthEnd } },
        select: { id: true, name: true, deadline: true, targetAmount: true, currency: true },
      }),
      prisma.budget.findMany({
        where: { userId, endDate: { gte: monthStart, lte: monthEnd } },
        select: { id: true, name: true, endDate: true, amount: true, spent: true },
      }),
    ]);

    events = [
      ...debts.map((d) => ({
        id: `debt-${d.id}`,
        title: d.name,
        date: d.dueDate as Date,
        type: "debt" as const,
        amount: decimalToNumber(d.remainingAmount),
        currency: d.currency,
        description: "Vencimiento de deuda",
      })),
      ...recurring.map((r) => ({
        id: `recurring-${r.id}`,
        title: r.name,
        date: r.nextDueDate as Date,
        type: "recurring" as const,
        amount: decimalToNumber(r.amount),
        currency: org.currency,
        description: "Pago recurrente",
      })),
      ...goals.map((g) => ({
        id: `goal-${g.id}`,
        title: g.name,
        date: g.deadline as Date,
        type: "goal" as const,
        amount: decimalToNumber(g.targetAmount),
        currency: g.currency,
        description: "Deadline de meta",
      })),
      ...budgets.map((b) => ({
        id: `budget-${b.id}`,
        title: b.name,
        date: b.endDate as Date,
        type: "budget" as const,
        amount: decimalToNumber(b.amount),
        currency: org.currency,
        description: `Usado ${formatCurrency(decimalToNumber(b.spent), org.currency)} de ${formatCurrency(
          decimalToNumber(b.amount),
          org.currency
        )}`,
      })),
    ];

    events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  const weeks = new Map<number, CalendarEvent[]>();
  events.forEach((ev) => {
    const ws = getWeekStart(ev.date).getTime();
    if (!weeks.has(ws)) weeks.set(ws, []);
    weeks.get(ws)!.push(ev);
  });

  const sortedWeeks = Array.from(weeks.entries()).sort((a, b) => a[0] - b[0]);

  const typeConfig: Record<
    string,
    { label: string; icon: React.ElementType; color: string }
  > = {
    debt: { label: "Deuda", icon: CreditCard, color: "bg-rose-500/15 text-rose-400 border-rose-500/20" },
    recurring: { label: "Recurrente", icon: Repeat, color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
    goal: { label: "Meta", icon: Target, color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
    budget: { label: "Presupuesto", icon: PiggyBank, color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  };

  const totalDue = events.reduce((sum, ev) => sum + (ev.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-section">Calendario Financiero</h1>
        <p className="body-default mt-1">
          Eventos financieros de {now.toLocaleString("es-CO", { month: "long", year: "numeric" })}
        </p>
      </div>

      {events.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiCard label="Eventos este mes" value={events.length} icon={Calendar} />
          <KpiCard label="Monto total" value={formatCurrency(totalDue, org.currency)} icon={CreditCard} />
        </div>
      )}

      {sortedWeeks.length === 0 ? (
        <EmptyStateCard
          icon={Calendar}
          title="No hay eventos financieros este mes"
          description="Cuando tengas vencimientos, pagos recurrentes o deadlines de metas, aparecerán aquí."
        />
      ) : (
        <div className="space-y-6">
          {sortedWeeks.map(([weekTs, weekEvents]) => {
            const weekStart = new Date(weekTs);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            return (
              <Card key={weekTs} className="surface-elevated-2 rounded-xl border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Semana del {weekStart.getDate()} al {weekEnd.getDate()} de{" "}
                    {weekEnd.toLocaleString("es-CO", { month: "long" })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {weekEvents.map((ev) => {
                    const cfg = typeConfig[ev.type];
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={ev.id}
                        className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cfg.color}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium">{ev.title}</p>
                            <p className="text-sm text-muted-foreground">{ev.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pl-12 sm:pl-0">
                          {ev.amount !== undefined && ev.currency && (
                            <span className="font-semibold">
                              {formatCurrency(ev.amount, ev.currency)}
                            </span>
                          )}
                          <Badge variant="outline">{formatDate(ev.date)}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
