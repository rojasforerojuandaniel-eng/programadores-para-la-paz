"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
} from "@/components/ui/bottom-sheet";
import { useIsMobile } from "@/hooks/use-media-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  format,
  isBefore,
  startOfDay,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale/es";
import {
  CreditCard,
  Repeat,
  Target,
  FileText,
  Scale,
  ChevronLeft,
  ChevronRight,
  Star,
  Calendar,
  CalendarDays,
  List,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

type CalendarEventType = "debt" | "recurring" | "goal" | "invoice" | "tax" | "subscription";
type View = "month" | "week" | "list";
type EventStatus = "upcoming" | "overdue" | "paid";

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
}

interface CalendarViewProps {
  orgCurrency: string;
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
  subscription: {
    label: "Suscripción",
    icon: Star,
    color: "bg-pink-500/15 text-pink-500 border-pink-500/20",
    href: "/dashboard/personal/subscriptions",
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

function formatLongDate(date: Date) {
  return format(date, "EEEE, d 'de' MMMM", { locale: es });
}

function getDisplayStatus(event: CalendarEvent): EventStatus {
  const isPaid =
    (event.type === "debt" && event.status === "PAID") ||
    (event.type === "invoice" && event.status === "PAID") ||
    (event.type === "tax" && event.status === "FILED") ||
    (event.type === "goal" && event.status === "COMPLETED");
  if (isPaid) return "paid";
  return isBefore(parseISO(event.date), startOfDay(new Date())) ? "overdue" : "upcoming";
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

function isPayable(event: CalendarEvent) {
  return ["debt", "invoice", "tax"].includes(event.type) && getDisplayStatus(event) !== "paid";
}

function getRange(view: View, date: Date) {
  if (view === "week") {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    return { from: start, to: end };
  }
  return { from: startOfMonth(date), to: endOfMonth(date) };
}

async function loadEvents(view: View, date: Date): Promise<CalendarEvent[]> {
  const { from, to } = getRange(view, date);
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  const res = await fetch(`/api/personal/calendar?${params.toString()}`);
  if (!res.ok) throw new Error("Error al cargar eventos");
  const data = (await res.json()) as { events?: CalendarEvent[] };
  return data.events ?? [];
}

function DayHeader({ day }: { day: Date }) {
  const narrow = format(day, "EEEEE", { locale: es }).toUpperCase();
  const full = format(day, "EEEE", { locale: es });
  return (
    <div
      className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs"
      title={full}
    >
      {narrow}
    </div>
  );
}

function EventDot({ event, size = "sm" }: { event: CalendarEvent; size?: "sm" | "md" }) {
  const cfg = typeConfig[event.type];
  const status = getDisplayStatus(event);
  return (
    <span
      className={cn(
        "inline-block rounded-full border",
        cfg.color.split(" ")[0],
        size === "md" ? "h-2.5 w-2.5" : "h-2 w-2",
        status === "overdue" && "bg-rose-500 border-rose-500"
      )}
      title={`${cfg.label} — ${getStatusConfig(status).label}`}
      aria-hidden="true"
    />
  );
}

function EventCard({
  event,
  onPay,
  paying,
  showLabels = false,
}: {
  event: CalendarEvent;
  onPay?: (event: CalendarEvent) => void;
  paying?: boolean;
  showLabels?: boolean;
}) {
  const cfg = typeConfig[event.type];
  const Icon = cfg.icon;
  const status = getDisplayStatus(event);
  const statusCfg = getStatusConfig(status);
  const StatusIcon = statusCfg.icon;
  const payable = isPayable(event);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3 min-w-0">
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
          <p className="font-medium truncate">{event.title}</p>
          <p className="text-sm text-muted-foreground truncate">{event.description}</p>
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
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
        <span className="font-semibold">{formatCurrency(event.amount, event.currency)}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={cfg.href}>
              <Eye className={cn("h-4 w-4", showLabels ? "mr-1" : "sm:mr-1")} />
              <span className={cn(!showLabels && "hidden sm:inline")}>Ver detalle</span>
            </Link>
          </Button>
          {payable && onPay && (
            <Button
              size="sm"
              onClick={() => onPay(event)}
              disabled={paying}
              aria-label={`Marcar ${event.title} como pagado`}
            >
              <CheckCircle className={cn("h-4 w-4", showLabels ? "mr-1" : "sm:mr-1")} />
              <span className={cn(!showLabels && "hidden sm:inline")}>
                {event.type === "tax" ? "Presentar" : "Pagar"}
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function DayCell({
  day,
  currentDate,
  selectedDate,
  events,
  onSelect,
}: {
  day: Date;
  currentDate: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  onSelect: (day: Date) => void;
}) {
  const dayEvents = events.filter((ev) => isSameDay(parseISO(ev.date), day));
  const muted = !isSameMonth(day, currentDate);
  const selected = isSameDay(day, selectedDate);

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      aria-label={`${formatLongDate(day)}, ${dayEvents.length} vencimientos`}
      aria-pressed={selected}
      className={cn(
        "relative flex min-h-[4.5rem] flex-col items-start justify-start rounded-lg border p-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[6rem] sm:p-2",
        muted ? "bg-muted/30 text-muted-foreground" : "bg-card hover:bg-accent/50",
        selected && "border-primary ring-1 ring-primary",
        isToday(day) && !selected && "ring-1 ring-primary/50"
      )}
    >
      <span
        className={cn(
          "text-sm font-medium",
          isToday(day) && "text-primary"
        )}
      >
        {format(day, "d")}
      </span>
      <div className="mt-auto flex w-full flex-wrap items-center justify-center gap-1">
        {dayEvents.slice(0, 4).map((ev) => (
          <EventDot key={ev.id} event={ev} />
        ))}
        {dayEvents.length > 4 && (
          <span className="text-[10px] leading-none text-muted-foreground">+</span>
        )}
      </div>
    </button>
  );
}

function SelectedDayPanel({
  date,
  events,
  onPay,
  payingId,
}: {
  date: Date;
  events: CalendarEvent[];
  onPay?: (event: CalendarEvent) => void;
  payingId?: string | null;
}) {
  const dayEvents = events.filter((ev) => isSameDay(parseISO(ev.date), date));

  return (
    <Card className="surface-elevated-2 h-fit">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base sm:text-lg">{formatLongDate(date)}</CardTitle>
        <CardDescription>
          {dayEvents.length} vencimiento{dayEvents.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {dayEvents.length === 0 ? (
          <EmptyStateCard
            variant="sm"
            icon={Calendar}
            title="Sin vencimientos"
            description="Selecciona otro día con actividad."
          />
        ) : (
          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
            {dayEvents.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                onPay={onPay}
                paying={payingId === ev.id}
                showLabels
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MobileDaySheet({
  open,
  onOpenChange,
  date,
  events,
  onPay,
  payingId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  events: CalendarEvent[];
  onPay?: (event: CalendarEvent) => void;
  payingId?: string | null;
}) {
  const dayEvents = events.filter((ev) => isSameDay(parseISO(ev.date), date));

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent side="bottom" snapPoints={["75dvh", "50dvh"]}>
        <BottomSheetHeader>
          <BottomSheetTitle>{formatLongDate(date)}</BottomSheetTitle>
          <BottomSheetDescription>
            {dayEvents.length} vencimiento{dayEvents.length !== 1 ? "s" : ""}
          </BottomSheetDescription>
        </BottomSheetHeader>
        <div className="flex flex-col gap-3">
          {dayEvents.length === 0 ? (
            <EmptyStateCard
              variant="sm"
              icon={Calendar}
              title="Sin vencimientos"
              description="Toca un día con color para ver sus detalles."
            />
          ) : (
            dayEvents.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                onPay={onPay}
                paying={payingId === ev.id}
                showLabels
              />
            ))
          )}
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}

export function CalendarView({ orgCurrency }: CalendarViewProps) {
  const isMobile = useIsMobile();
  const [view, setView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await loadEvents(view, currentDate);
        if (!cancelled) setEvents(data);
      } catch {
        if (!cancelled) {
          setEvents([]);
          toast.error("No se pudieron cargar los vencimientos");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [view, currentDate]);

  const handlePay = async (event: CalendarEvent) => {
    setPayingId(event.id);
    try {
      const res = await fetch(`/api/personal/calendar/${event.id}/pay`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Error al marcar como pagado");
      toast.success(`${event.title} marcado como resuelto`);
      const data = await loadEvents(view, currentDate);
      setEvents(data);
    } catch {
      toast.error("No se pudo marcar como pagado");
    } finally {
      setPayingId(null);
    }
  };

  const { from, to } = useMemo(() => getRange(view, currentDate), [view, currentDate]);
  const days = useMemo(() => eachDayOfInterval({ start: from, end: to }), [from, to]);

  const periodLabel = useMemo(() => {
    if (view === "week") {
      return `${format(from, "d MMM", { locale: es })} — ${format(to, "d MMM yyyy", {
        locale: es,
      })}`;
    }
    return format(currentDate, "MMMM yyyy", { locale: es });
  }, [view, from, to, currentDate]);

  const kpis = useMemo(() => {
    let totalAmount = 0;
    let overdue = 0;
    let paid = 0;
    for (const ev of events) {
      if (getDisplayStatus(ev) !== "paid") totalAmount += ev.amount;
      if (getDisplayStatus(ev) === "overdue") overdue += 1;
      if (getDisplayStatus(ev) === "paid") paid += 1;
    }
    return { totalAmount, overdue, paid, count: events.length };
  }, [events]);

  function movePeriod(next: Date) {
    setCurrentDate(next);
    if (!isSameMonth(selectedDate, next)) {
      setSelectedDate(startOfMonth(next));
    }
  }

  function navigatePrev() {
    const next = view === "week" ? subWeeks(currentDate, 1) : subMonths(currentDate, 1);
    movePeriod(next);
  }

  function navigateNext() {
    const next = view === "week" ? addWeeks(currentDate, 1) : addMonths(currentDate, 1);
    movePeriod(next);
  }

  function goToToday() {
    movePeriod(new Date());
  }

  function selectDay(day: Date) {
    setSelectedDate(day);
    if (!isSameMonth(day, currentDate)) {
      setCurrentDate(day);
    }
    if (isMobile) {
      setSheetOpen(true);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-section">Calendario de Vencimientos</h1>
          <p className="body-default mt-1">Visualiza y gestiona tus obligaciones financieras</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Eventos" value={kpis.count} icon={Calendar} />
        <KpiCard
          label="Por vencer"
          value={formatCurrency(kpis.totalAmount, orgCurrency)}
          icon={CreditCard}
        />
        <KpiCard
          label="Vencidos"
          value={kpis.overdue}
          icon={AlertTriangle}
          valueClassName={kpis.overdue > 0 ? "text-rose-600" : undefined}
        />
        <KpiCard label="Pagados" value={kpis.paid} icon={CheckCircle2} />
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as View)} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList aria-label="Vista del calendario">
            <TabsTrigger value="month" aria-label="Vista mensual">
              <Calendar className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Mensual</span>
            </TabsTrigger>
            <TabsTrigger value="week" aria-label="Vista semanal">
              <CalendarDays className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Semanal</span>
            </TabsTrigger>
            <TabsTrigger value="list" aria-label="Vista de lista">
              <List className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Lista</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-lg"
              onClick={navigatePrev}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <span className="min-w-[9rem] text-center text-sm font-medium capitalize sm:text-base">
              {periodLabel}
            </span>
            <Button
              variant="outline"
              size="icon-lg"
              onClick={navigateNext}
              aria-label="Siguiente"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Hoy
            </Button>
          </div>
        </div>

        <TabsContent value="month" className="mt-0">
          {events.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_360px]">
              <Card className="surface-elevated-2">
                <CardContent className="p-2 sm:p-4">
                  <div className="grid grid-cols-7 gap-1">
                    {days.slice(0, 7).map((day) => (
                      <DayHeader key={day.toISOString()} day={day} />
                    ))}
                    {days.map((day) => (
                      <DayCell
                        key={day.toISOString()}
                        day={day}
                        currentDate={currentDate}
                        selectedDate={selectedDate}
                        events={events}
                        onSelect={selectDay}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="hidden md:block">
                <SelectedDayPanel
                  date={selectedDate}
                  events={events}
                  onPay={handlePay}
                  payingId={payingId}
                />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="week" className="mt-0">
          {events.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
              {days.map((day) => {
                const dayEvents = events.filter((ev) => isSameDay(parseISO(ev.date), day));
                return (
                  <Card
                    key={day.toISOString()}
                    className={cn(
                      "surface-elevated-2 flex flex-col",
                      isToday(day) && "ring-1 ring-primary"
                    )}
                  >
                    <CardHeader className="p-3 pb-0">
                      <CardTitle className={cn("text-sm", isToday(day) && "text-primary")}>
                        {formatLongDate(day)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-3">
                      {dayEvents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin vencimientos</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {dayEvents.map((ev) => (
                            <MiniEvent key={ev.id} event={ev} />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          {events.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6">
              {groupEventsByDate(events).map(([dateKey, dayEvents]) => (
                <div key={dateKey}>
                  <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {formatLongDate(parseISO(dateKey))}
                  </h2>
                  <div className="flex flex-col gap-3">
                    {dayEvents.map((ev) => (
                      <EventCard
                        key={ev.id}
                        event={ev}
                        onPay={handlePay}
                        paying={payingId === ev.id}
                        showLabels
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <EventLegend />

      {isMobile && (
        <MobileDaySheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          date={selectedDate}
          events={events}
          onPay={handlePay}
          payingId={payingId}
        />
      )}
    </div>
  );
}

function MiniEvent({ event }: { event: CalendarEvent }) {
  const cfg = typeConfig[event.type];
  const Icon = cfg.icon;
  const status = getDisplayStatus(event);
  const statusCfg = getStatusConfig(status);
  return (
    <Link
      href={cfg.href}
      className="flex items-center gap-2 rounded-md border border-border p-2 text-sm transition-colors hover:bg-accent"
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
          cfg.color
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{event.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatCurrency(event.amount, event.currency)}
        </p>
      </div>
      <Badge variant="outline" className={statusCfg.className}>
        {statusCfg.label}
      </Badge>
    </Link>
  );
}

function groupEventsByDate(events: CalendarEvent[]): [string, CalendarEvent[]][] {
  const groups = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const key = ev.date.slice(0, 10);
    let list = groups.get(key);
    if (!list) {
      list = [];
      groups.set(key, list);
    }
    list.push(ev);
  }
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function EmptyState() {
  return (
    <EmptyStateCard
      variant="lg"
      icon={Calendar}
      title="Sin vencimientos en este periodo"
      description="Aquí aparecerán deudas, pagos recurrentes, suscripciones, metas, facturas e impuestos con fecha de vencimiento."
      hint="Navega a otro periodo o crea tus primeros registros."
    />
  );
}

function EventLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span>Tipos:</span>
      {(Object.keys(typeConfig) as CalendarEventType[]).map((type) => {
        const cfg = typeConfig[type];
        return (
          <span key={type} className="inline-flex items-center gap-1">
            <span className={cn("inline-block h-2 w-2 rounded-full", cfg.color.split(" ")[0])} />
            {cfg.label}
          </span>
        );
      })}
      <span className="mx-1 hidden sm:inline">|</span>
      <span>Estados:</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3 w-3" /> Próximo
      </span>
      <span className="inline-flex items-center gap-1 text-rose-600">
        <AlertTriangle className="h-3 w-3" /> Vencido
      </span>
      <span className="inline-flex items-center gap-1 text-emerald-600">
        <CheckCircle2 className="h-3 w-3" /> Pagado
      </span>
    </div>
  );
}
