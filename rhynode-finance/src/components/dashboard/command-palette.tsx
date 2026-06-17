"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  Target,
  Bell,
  Landmark,
  Settings,
  Plus,
  CircleHelp,
  Clock,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type CommandItem = {
  id: string;
  label: string;
  href?: string;
  icon: React.ElementType;
  shortcut?: string;
  section: string;
};

const MAX_RECENTS = 5;
const RECENTS_KEY = "rhynode-cmd-recent";

const NAV_COMMANDS: CommandItem[] = [
  {
    id: "nav-dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: "Ir a",
  },
  {
    id: "nav-transactions",
    label: "Transacciones",
    href: "/dashboard/transactions",
    icon: ArrowLeftRight,
    section: "Ir a",
  },
  {
    id: "nav-invoices",
    label: "Facturas",
    href: "/dashboard/invoices",
    icon: FileText,
    section: "Ir a",
  },
  {
    id: "nav-goals",
    label: "Metas",
    href: "/dashboard/personal/goals",
    icon: Target,
    section: "Ir a",
  },
  {
    id: "nav-reminders",
    label: "Recordatorios",
    href: "/dashboard/personal/reminders",
    icon: Bell,
    section: "Ir a",
  },
  {
    id: "nav-accounts",
    label: "Cuentas bancarias",
    href: "/dashboard/accounts",
    icon: Landmark,
    section: "Ir a",
  },
  {
    id: "nav-settings",
    label: "Configuración",
    href: "/dashboard/settings",
    icon: Settings,
    section: "Ir a",
  },
];

const ACTION_COMMANDS: CommandItem[] = [
  {
    id: "action-new-transaction",
    label: "Crear transacción",
    href: "/dashboard/transactions?new=1",
    icon: Plus,
    shortcut: "Nueva transacción",
    section: "Acciones",
  },
  {
    id: "action-new-invoice",
    label: "Crear factura",
    href: "/dashboard/invoices?new=1",
    icon: Plus,
    shortcut: "Nueva factura",
    section: "Acciones",
  },
  {
    id: "action-new-goal",
    label: "Añadir meta",
    href: "/dashboard/personal/goals?new=1",
    icon: Plus,
    shortcut: "Nueva meta",
    section: "Acciones",
  },
  {
    id: "action-new-reminder",
    label: "Nuevo recordatorio",
    href: "/dashboard/personal/reminders?new=1",
    icon: Plus,
    shortcut: "Nuevo recordatorio",
    section: "Acciones",
  },
];

const HELP_COMMANDS: CommandItem[] = [
  {
    id: "help-support",
    label: "Centro de ayuda",
    href: "/dashboard/settings",
    icon: CircleHelp,
    section: "Ayuda",
  },
];

type StoredRecent = {
  id: string;
  label: string;
  href?: string;
  section: string;
};

function readRecents(): StoredRecent[] {
  if (typeof window === "undefined") return recentsCache;
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const parsed: StoredRecent[] = raw
      ? (JSON.parse(raw) as StoredRecent[]).filter((item) => item.id && item.label)
      : [];
    const stable =
      JSON.stringify(parsed) === JSON.stringify(recentsCache)
        ? recentsCache
        : (recentsCache = parsed);
    return stable;
  } catch {
    return recentsCache;
  }
}

function saveRecents(recents: StoredRecent[]) {
  recentsCache = recents;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
  } catch {
    // ignore storage errors
  }
}

let recentsCache: StoredRecent[] = [];

function subscribeToRecents(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function recordRecent(recents: StoredRecent[], command: CommandItem) {
  const withoutCurrent = recents.filter((item) => item.id !== command.id);
  const next = [
    { id: command.id, label: command.label, href: command.href, section: "Reciente" },
    ...withoutCurrent,
  ].slice(0, MAX_RECENTS);
  saveRecents(next);
}

function buildGroups(
  query: string,
  recents: StoredRecent[]
): { heading: string; items: CommandItem[] }[] {
  const q = query.trim().toLowerCase();

  const matches = (item: CommandItem) =>
    !q ||
    item.label.toLowerCase().includes(q) ||
    item.section.toLowerCase().includes(q) ||
    (item.href?.toLowerCase().includes(q) ?? false);

  const recentItems: CommandItem[] = recents
    .filter((item) => {
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.section.toLowerCase().includes(q) ||
        (item.href?.toLowerCase().includes(q) ?? false)
      );
    })
    .map((item) => ({ ...item, icon: Clock }));

  const navItems = NAV_COMMANDS.filter(matches);
  const actionItems = ACTION_COMMANDS.filter(matches);
  const helpItems = HELP_COMMANDS.filter(matches);

  const groups: { heading: string; items: CommandItem[] }[] = [];
  if (recentItems.length > 0) {
    groups.push({ heading: "Reciente", items: recentItems });
  }
  if (navItems.length > 0) {
    groups.push({ heading: "Ir a", items: navItems });
  }
  if (actionItems.length > 0) {
    groups.push({ heading: "Acciones", items: actionItems });
  }
  if (helpItems.length > 0) {
    groups.push({ heading: "Ayuda", items: helpItems });
  }

  return groups;
}

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQueryState] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const recents = React.useSyncExternalStore(subscribeToRecents, readRecents, readRecents);

  const groups = React.useMemo(
    () => buildGroups(query, recents),
    [query, recents]
  );

  const flatItems = React.useMemo(
    () => groups.flatMap((group) => group.items),
    [groups]
  );

  const setQuery = React.useCallback(
    (value: string) => {
      setQueryState(value);
      setSelectedIndex(0);
    },
    []
  );

  const execute = React.useCallback(
    (item: CommandItem) => {
      setIsOpen(false);
      setQuery("");
      trackEvent("command_palette_select", {
        commandId: item.id,
        section: item.section,
        hasHref: Boolean(item.href),
      });

      if (item.href) {
        recordRecent(recents, item);
        router.push(item.href);
      }
    },
    [recents, router, setQuery]
  );

  React.useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) =>
          flatItems.length === 0 ? 0 : (prev + 1) % flatItems.length
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) =>
          flatItems.length === 0
            ? 0
            : (prev - 1 + flatItems.length) % flatItems.length
        );
      } else if (event.key === "Enter" && flatItems.length > 0) {
        event.preventDefault();
        const item = flatItems[selectedIndex];
        if (item) execute(item);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flatItems, selectedIndex, execute]);

  React.useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
    triggerRef.current?.focus();
  }, [isOpen]);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir paleta de comandos (⌘K)"
      >
        <Search className="h-5 w-5" aria-hidden="true" />
      </Button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setSelectedIndex(0);
        }}
      >
        <DialogContent
          className="max-h-[80vh] gap-0 overflow-hidden p-0 sm:max-w-xl"
          showCloseButton={false}
          aria-modal="true"
        >
          <DialogTitle className="sr-only">Paleta de comandos</DialogTitle>
          <DialogDescription className="sr-only">
            Paleta de comandos para navegar rápidamente a secciones y ejecutar acciones.
          </DialogDescription>
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar comando o ir a..."
              className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              aria-label="Buscar comando"
              autoComplete="off"
            />
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              ESC
            </kbd>
          </div>

          <div
            className="min-h-[12rem] overflow-y-auto p-2"
            role="listbox"
            aria-label="Comandos"
          >
            {flatItems.length === 0 && (
              <div className="flex h-32 flex-col items-center justify-center gap-1 px-6 text-center text-muted-foreground">
                <Search className="h-6 w-6 opacity-40" aria-hidden="true" />
                <p className="text-sm">No se encontraron comandos</p>
                <p className="text-xs">Prueba con otro término</p>
              </div>
            )}

            {groups.map((group) => (
              <div key={group.heading} className="mt-2 first:mt-0">
                <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.heading}
                </h3>
                <ul className="space-y-0.5" role="group" aria-label={group.heading}>
                  {group.items.map((item) => {
                    const globalIndex = flatItems.indexOf(item);
                    const isSelected = globalIndex === selectedIndex;
                    const Icon = item.icon;
                    return (
                      <li key={`${group.heading}-${item.id}`} role="none">
                        <button
                          type="button"
                          onClick={() => execute(item)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm outline-none transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground hover:bg-muted"
                          )}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              isSelected
                                ? "text-primary-foreground"
                                : "text-muted-foreground"
                            )}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate text-left">
                            {item.label}
                          </span>
                          {item.shortcut && (
                            <span
                              className={cn(
                                "hidden text-xs sm:inline",
                                isSelected
                                  ? "text-primary-foreground/80"
                                  : "text-muted-foreground"
                              )}
                            >
                              {item.shortcut}
                            </span>
                          )}
                          {isSelected && (
                            <CornerDownLeft
                              className="h-4 w-4 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">{flatItems.length} comandos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">↑↓ navegar</span>
              <span className="hidden sm:inline">Enter ejecutar</span>
              <span className="hidden sm:inline">Esc cerrar</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
