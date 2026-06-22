"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/lib/locale";
import { formatCurrency } from "@/lib/format";
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
import { es as esFns, enUS } from "date-fns/locale";
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
  { icon: React.ElementType; color: string; href: string }
> = {
  debt: {
    icon: CreditCard,
    color: "bg-rose-500/15 text-rose-500 border-rose-500/20",
    href: "/dashboard/personal/debts",
  },
  recurring: {
    icon: Repeat,
    color: "bg-blue-500/15 text-blue-500 border-blue-500/20",
    href: "/dashboard/personal/recurring",
  },
  subscription: {
    icon: Star,
    color: "bg-pink-500/15 text-pink-500 border-pink-500/20",
    href: "/dashboard/personal/subscriptions",
  },
  goal: {
    icon: Target,
    color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
    href: "/dashboard/personal/goals",
  },
  invoice: {
    icon: FileText,
    color: "bg-violet-500/15 text-violet-500 border-violet-500/20",
    href: "/dashboard/invoices",
  },
  tax: {
    icon: Scale,
    color: "bg-amber-500/15 text-amber-500 border-amber-500/20",
    href: "/dashboard/tax",
  },
};

function fnsLocale(locale: Locale) {
  return locale === "en" ? enUS : esFns;
}

function formatLongDate(date: Date, locale: Locale) {
  const fmt = locale === "en" ? "EEEE, MMMM d" : "EEEE, d 'de' MMMM";
  return format(date, fmt, { locale: fnsLocale(locale) });
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
        className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        icon: CheckCircle2,
      };
    case "overdue":
      return {
        className: "bg-rose-500/10 text-rose-600 border-rose-500/20",
        icon: AlertTriangle,
      };
    default:
      return {
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
  const locale = useLocale() as Locale;
  const narrow = format(day, "EEEEE", { locale: fnsLocale(locale) }).toUpperCase();
  const full = format(day, "EEEE", { locale: fnsLocale(locale) });
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
  const t = useTranslations("dashboard.calendar");
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
      title={`${t(`view.types.${event.type}` as never)} — ${t(`view.status.${status}` as never)}`}
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
  const t = useTranslations("dashboard.calendar");
  const locale = useLocale() as Locale;
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
              <span>{t(`view.status.${status}` as never)}</span>
            </Badge>
            <Badge variant="outline" className={cn("gap-1", cfg.color)}>
              <Icon className="h-3 w-3" />
              <span>{t(`view.types.${event.type}` as never)}</span>
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
        <span className="font-semibold">{formatCurrency(event.amount, event.currency, locale)}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={cfg.href}>
              <Eye className={cn("h-4 w-4", showLabels ? "mr-1" : "sm:mr-1")} />
              <span className={cn(!showLabels && "hidden sm:inline")}>{t("view.actions.viewDetails")}</span>
            </Link>
          </Button>
          {payable && onPay && (
            <Button
              size="sm"
              onClick={() => onPay(event)}
              disabled={paying}
              aria-label={t("view.actions.markPaidAria", { title: event.title })}
            >
              <CheckCircle className={cn("h-4 w-4", showLabels ? "mr-1" : "sm:mr-1")} />
              <span className={cn(!showLabels && "hidden sm:inline")}>
                {event.type === "tax" ? t("view.actions.file") : t("view.actions.pay")}
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
  const t = useTranslations("dashboard.calendar");
  const locale = useLocale() as Locale;
  const dayEvents = events.filter((ev) => isSameDay(parseISO(ev.date), day));
  const muted = !isSameMonth(day, currentDate);
  const selected = isSameDay(day, selectedDate);

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      aria-label={t("view.aria.dayCell", { date: formatLongDate(day, locale), count: dayEvents.length })}
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
  const t = useTranslations("dashboard.calendar");
  const locale = useLocale() as Locale;
  const dayEvents = events.filter((ev) => isSameDay(parseISO(ev.date), date));

  return (
    <Card className="surface-elevated-2 h-fit">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base sm:text-lg">{formatLongDate(date, locale)}</CardTitle>
        <CardDescription>
          {t("view.count.dueDates", { count: dayEvents.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {dayEvents.length === 0 ? (
          <EmptyStateCard
            variant="sm"
            icon={Calendar}
            title={t("view.empty.title")}
            description={t("view.empty.description")}
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
  const t = useTranslations("dashboard.calendar");
  const locale = useLocale() as Locale;
  const dayEvents = events.filter((ev) => isSameDay(parseISO(ev.date), date));

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent side="bottom" snapPoints={["75dvh", "50dvh"]}>
        <BottomSheetHeader>
          <BottomSheetTitle>{formatLongDate(date, locale)}</BottomSheetTitle>
          <BottomSheetDescription>
            {t("view.count.dueDates", { count: dayEvents.length })}
          </BottomSheetDescription>
        </BottomSheetHeader>
        <div className="flex flex-col gap-3">
          {dayEvents.length === 0 ? (
            <EmptyStateCard
              variant="sm"
              icon={Calendar}
              title={t("view.empty.title")}
              description={t("view.empty.mobileDescription")}
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
  const t = useTranslations("dashboard.calendar");
  const locale = useLocale() as Locale;
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
          toast.error(t("view.errors.loadToast"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [view, currentDate, t]);

  const handlePay = async (event: CalendarEvent) => {
    setPayingId(event.id);
    try {
      const res = await fetch(`/api/personal/calendar/${event.id}/pay`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Error al marcar como pagado");
      toast.success(t("view.actions.markedResolved", { title: event.title }));
      const data = await loadEvents(view, currentDate);
      setEvents(data);
    } catch {
      toast.error(t("view.errors.markPaidToast"));
    } finally {
      setPayingId(null);
    }
  };

  const { from, to } = useMemo(() => getRange(view, currentDate), [view, currentDate]);
  const days = useMemo(() => eachDayOfInterval({ start: from, end: to }), [from, to]);

  const periodLabel = useMemo(() => {
    const fns = fnsLocale(locale);
    if (view === "week") {
      return `${format(from, "d MMM", { locale: fns })} — ${format(to, "d MMM yyyy", {
        locale: fns,
      })}`;
    }
    return format(currentDate, "MMMM yyyy", { locale: fns });
  }, [view, from, to, currentDate, locale]);

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
          <h1 className="heading-section">{t("view.title")}</h1>
          <p className="body-default mt-1">{t("view.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label={t("view.kpis.events")} value={kpis.count} icon={Calendar} />
        <KpiCard
          label={t("view.kpis.upcoming")}
          value={formatCurrency(kpis.totalAmount, orgCurrency, locale)}
          icon={CreditCard}
        />
        <KpiCard
          label={t("view.kpis.overdue")}
          value={kpis.overdue}
          icon={AlertTriangle}
          valueClassName={kpis.overdue > 0 ? "text-rose-600" : undefined}
        />
        <KpiCard label={t("view.kpis.paid")} value={kpis.paid} icon={CheckCircle2} />
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as View)} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList aria-label={t("view.aria.calendarView")}>
            <TabsTrigger value="month" aria-label={t("view.aria.monthView")}>
              <Calendar className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{t("view.tabs.month")}</span>
            </TabsTrigger>
            <TabsTrigger value="week" aria-label={t("view.aria.weekView")}>
              <CalendarDays className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{t("view.tabs.week")}</span>
            </TabsTrigger>
            <TabsTrigger value="list" aria-label={t("view.aria.listView")}>
              <List className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{t("view.tabs.list")}</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-lg"
              onClick={navigatePrev}
              aria-label={t("view.aria.prev")}
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
              aria-label={t("view.aria.next")}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToToday}>
              {t("days.today")}
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
                        {formatLongDate(day, locale)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-3">
                      {dayEvents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("view.noDueDates")}</p>
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
                    {formatLongDate(parseISO(dateKey), locale)}
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
  const t = useTranslations("dashboard.calendar");
  const locale = useLocale() as Locale;
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
          {formatCurrency(event.amount, event.currency, locale)}
        </p>
      </div>
      <Badge variant="outline" className={statusCfg.className}>
        {t(`view.status.${status}` as never)}
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
  const t = useTranslations("dashboard.calendar");
  return (
    <EmptyStateCard
      variant="lg"
      icon={Calendar}
      title={t("view.empty.periodTitle")}
      description={t("view.empty.periodDescription")}
      hint={t("view.empty.periodHint")}
    />
  );
}

function EventLegend() {
  const t = useTranslations("dashboard.calendar");
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span>{t("view.legend.types")}</span>
      {(Object.keys(typeConfig) as CalendarEventType[]).map((type) => {
        const cfg = typeConfig[type];
        return (
          <span key={type} className="inline-flex items-center gap-1">
            <span className={cn("inline-block h-2 w-2 rounded-full", cfg.color.split(" ")[0])} />
            {t(`view.types.${type}` as never)}
          </span>
        );
      })}
      <span className="mx-1 hidden sm:inline">|</span>
      <span>{t("view.legend.statuses")}</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3 w-3" /> {t("view.status.upcoming" as never)}
      </span>
      <span className="inline-flex items-center gap-1 text-rose-600">
        <AlertTriangle className="h-3 w-3" /> {t("view.status.overdue" as never)}
      </span>
      <span className="inline-flex items-center gap-1 text-emerald-600">
        <CheckCircle2 className="h-3 w-3" /> {t("view.status.paid" as never)}
      </span>
    </div>
  );
}