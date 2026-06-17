"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  Inbox,
  Loader2,
  Trash2,
  Settings,
  Wallet,
  CreditCard,
  Calendar,
  Trophy,
  ArrowLeftRight,
  FileText,
  Sparkles,
  AlertCircle,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  actionUrl: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: boolean;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: false,
};

const notificationIcons: Record<string, LucideIcon> = {
  budget: Wallet,
  subscription: CreditCard,
  weekly_summary: Calendar,
  reminder: Bell,
  achievement: Trophy,
  transaction: ArrowLeftRight,
  invoice: FileText,
  insight: Sparkles,
  alert: AlertCircle,
  investment: TrendingUp,
  system: Bell,
};

let storeState: NotificationState = { ...initialState };
const listeners = new Set<() => void>();
let pollInterval: ReturnType<typeof setInterval> | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

async function loadNotifications() {
  const isFirstLoad = storeState.notifications.length === 0;
  storeState = { ...storeState, loading: isFirstLoad, error: false };
  emit();

  try {
    const response = await fetch("/api/notifications");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as NotificationsResponse;
    const list = data.notifications ?? [];
    storeState = {
      notifications: list,
      unreadCount: list.filter((n) => !n.read).length,
      loading: false,
      error: false,
    };
  } catch {
    storeState = { ...storeState, loading: false, error: true };
  }
  emit();
}

function startPolling() {
  if (pollInterval) return;
  loadNotifications();
  pollInterval = setInterval(loadNotifications, 60000);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  startPolling();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopPolling();
    }
  };
}

function getSnapshot() {
  return storeState;
}

function markAsReadOptimistically(id: string) {
  const updated = storeState.notifications.map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  storeState = {
    ...storeState,
    notifications: updated,
    unreadCount: updated.filter((n) => !n.read).length,
  };
  emit();

  fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => {
    loadNotifications();
  });
}

function markAllAsReadOptimistically() {
  const updated = storeState.notifications.map((n) => ({ ...n, read: true }));
  storeState = { ...storeState, notifications: updated, unreadCount: 0 };
  emit();

  fetch("/api/notifications/read-all", { method: "POST" }).catch(() => {
    loadNotifications();
  });
}

function deleteOptimistically(id: string) {
  const removed = storeState.notifications.find((n) => n.id === id);
  const updated = storeState.notifications.filter((n) => n.id !== id);
  storeState = {
    ...storeState,
    notifications: updated,
    unreadCount: updated.filter((n) => !n.read).length,
  };
  emit();

  fetch(`/api/notifications/${id}`, { method: "DELETE" }).catch(() => {
    if (removed) {
      storeState = {
        ...storeState,
        notifications: [...storeState.notifications, removed].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        unreadCount:
          storeState.unreadCount + (removed.read ? 0 : 1),
      };
      emit();
    }
  });
}

function useNotificationStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function formatTimestamp(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: es,
    });
  } catch {
    return dateString;
  }
}

function getNotificationIcon(type: string): LucideIcon {
  return notificationIcons[type] ?? Bell;
}

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium">No tienes notificaciones</p>
        <p className="text-xs text-muted-foreground">
          Te avisaremos cuando haya algo nuevo.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onClose}>
        Entendido
      </Button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <p className="text-sm font-medium">No se pudieron cargar las notificaciones</p>
      <p className="text-xs text-muted-foreground">Intenta de nuevo en un momento.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, loading, error } = useNotificationStore();

  const handleRetry = useCallback(() => {
    loadNotifications();
  }, []);

  const triggerLabel = useMemo(() => {
    if (unreadCount === 0) return "Notificaciones";
    return `Notificaciones, ${unreadCount} sin leer`;
  }, [unreadCount]);

  const content = (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">Notificaciones</h2>
          <p className="text-xs text-muted-foreground">
            {unreadCount === 0
              ? "No tienes notificaciones sin leer"
              : `${unreadCount} sin leer`}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsReadOptimistically}
            aria-label="Marcar todas las notificaciones como leídas"
          >
            <Check className="mr-1 h-4 w-4" aria-hidden="true" />
            Todas
          </Button>
        )}
      </div>
      <Separator />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-10" aria-live="polite" aria-busy="true">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Cargando notificaciones</span>
          </div>
        ) : error ? (
          <ErrorState onRetry={handleRetry} />
        ) : notifications.length === 0 ? (
          <EmptyState onClose={() => setOpen(false)} />
        ) : (
          <ul className="divide-y divide-border" role="list">
            {notifications.map((notification) => {
              const TypeIcon = getNotificationIcon(notification.type);
              return (
                <li
                  key={notification.id}
                  className={cn(
                    "flex gap-3 p-4 transition-colors",
                    !notification.read && "bg-muted/40"
                  )}
                >
                  <div className="flex shrink-0 pt-0.5">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        !notification.read
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <TypeIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.body}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTimestamp(notification.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => markAsReadOptimistically(notification.id)}
                        aria-label={`Marcar como leída: ${notification.title}`}
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => deleteOptimistically(notification.id)}
                      aria-label={`Eliminar notificación: ${notification.title}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Separator />
      <div className="p-2">
        <Link
          href="/dashboard/settings"
          onClick={() => setOpen(false)}
          className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Preferencias de notificaciones
        </Link>
      </div>
    </div>
  );

  const triggerButton = (
    <Button
      variant="ghost"
      size="icon"
      aria-label={triggerLabel}
      className="relative h-10 w-10"
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium"
          aria-hidden="true"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );

  return (
    <>
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>{triggerButton}</SheetTrigger>
          <SheetContent side="right" className="w-full p-0 sm:max-w-sm" role="dialog" aria-modal="true" aria-label="Centro de notificaciones">
            <SheetHeader className="sr-only">
              <SheetTitle>Notificaciones</SheetTitle>
              <SheetDescription>Lista de notificaciones recientes.</SheetDescription>
            </SheetHeader>
            {content}
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden lg:block">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-80 p-0"
            role="dialog"
            aria-label="Centro de notificaciones"
          >
            {content}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
