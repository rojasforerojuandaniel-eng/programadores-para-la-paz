"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  labelKey: string;
  href?: string;
  icon: React.ElementType;
  shortcutKey?: string;
  sectionKey: string;
};

const MAX_RECENTS = 5;
const RECENTS_KEY = "rhynode-cmd-recent";

const NAV_COMMANDS: CommandItem[] = [
  {
    id: "nav-dashboard",
    labelKey: "home",
    href: "/dashboard",
    icon: LayoutDashboard,
    sectionKey: "goTo",
  },
  {
    id: "nav-transactions",
    labelKey: "transactions",
    href: "/dashboard/transactions",
    icon: ArrowLeftRight,
    sectionKey: "goTo",
  },
  {
    id: "nav-invoices",
    labelKey: "invoices",
    href: "/dashboard/invoices",
    icon: FileText,
    sectionKey: "goTo",
  },
  {
    id: "nav-goals",
    labelKey: "goals",
    href: "/dashboard/personal/goals",
    icon: Target,
    sectionKey: "goTo",
  },
  {
    id: "nav-reminders",
    labelKey: "reminders",
    href: "/dashboard/personal/reminders",
    icon: Bell,
    sectionKey: "goTo",
  },
  {
    id: "nav-accounts",
    labelKey: "accounts",
    href: "/dashboard/accounts",
    icon: Landmark,
    sectionKey: "goTo",
  },
  {
    id: "nav-settings",
    labelKey: "settings",
    href: "/dashboard/settings",
    icon: Settings,
    sectionKey: "goTo",
  },
];

const ACTION_COMMANDS: CommandItem[] = [
  {
    id: "action-new-transaction",
    labelKey: "newTransaction",
    href: "/dashboard/transactions?new=1",
    icon: Plus,
    shortcutKey: "newTransactionShortcut",
    sectionKey: "actions",
  },
  {
    id: "action-new-invoice",
    labelKey: "newInvoice",
    href: "/dashboard/invoices?new=1",
    icon: Plus,
    shortcutKey: "newInvoiceShortcut",
    sectionKey: "actions",
  },
  {
    id: "action-new-goal",
    labelKey: "newGoal",
    href: "/dashboard/personal/goals?new=1",
    icon: Plus,
    shortcutKey: "newGoalShortcut",
    sectionKey: "actions",
  },
  {
    id: "action-new-reminder",
    labelKey: "newReminder",
    href: "/dashboard/personal/reminders?new=1",
    icon: Plus,
    shortcutKey: "newReminderShortcut",
    sectionKey: "actions",
  },
];

const HELP_COMMANDS: CommandItem[] = [
  {
    id: "help-support",
    labelKey: "helpCenter",
    href: "/dashboard/settings",
    icon: CircleHelp,
    sectionKey: "help",
  },
];

type StoredRecent = {
  id: string;
  labelKey: string;
  href?: string;
  sectionKey: string;
};

function readRecents(): StoredRecent[] {
  if (typeof window === "undefined") return recentsCache;
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const parsed: StoredRecent[] = raw
      ? (JSON.parse(raw) as StoredRecent[]).filter((item) => item.id && item.labelKey)
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
    { id: command.id, labelKey: command.labelKey, href: command.href, sectionKey: "recent" },
    ...withoutCurrent,
  ].slice(0, MAX_RECENTS);
  saveRecents(next);
}

function buildGroups(
  query: string,
  recents: StoredRecent[],
  resolveLabel: (item: { id: string; labelKey: string }) => string,
  resolveSection: (key: string) => string,
): { headingKey: string; items: CommandItem[] }[] {
  const q = query.trim().toLowerCase();

  const matches = (
    item: { id: string; labelKey: string; href?: string },
    resolvedLabel: string,
    resolvedSection: string,
  ) =>
    !q ||
    resolvedLabel.toLowerCase().includes(q) ||
    resolvedSection.toLowerCase().includes(q) ||
    (item.href?.toLowerCase().includes(q) ?? false);

  const recentItems: CommandItem[] = recents
    .filter((item) => {
      if (!q) return true;
      return matches(item, resolveLabel(item), resolveSection(item.sectionKey));
    })
    .map((item) => ({
      id: item.id,
      labelKey: item.labelKey,
      href: item.href,
      icon: Clock,
      sectionKey: "recent",
    }));

  const navItems = NAV_COMMANDS.filter((item) =>
    matches(item, resolveLabel(item), resolveSection(item.sectionKey)),
  );
  const actionItems = ACTION_COMMANDS.filter((item) =>
    matches(item, resolveLabel(item), resolveSection(item.sectionKey)),
  );
  const helpItems = HELP_COMMANDS.filter((item) =>
    matches(item, resolveLabel(item), resolveSection(item.sectionKey)),
  );

  const groups: { headingKey: string; items: CommandItem[] }[] = [];
  if (recentItems.length > 0) {
    groups.push({ headingKey: "recent", items: recentItems });
  }
  if (navItems.length > 0) {
    groups.push({ headingKey: "goTo", items: navItems });
  }
  if (actionItems.length > 0) {
    groups.push({ headingKey: "actions", items: actionItems });
  }
  if (helpItems.length > 0) {
    groups.push({ headingKey: "help", items: helpItems });
  }

  return groups;
}

export function CommandPalette() {
  const router = useRouter();
  const t = useTranslations("dashboard.commandPalette");
  const tNav = useTranslations("dashboard.nav");
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQueryState] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const recents = React.useSyncExternalStore(subscribeToRecents, readRecents, readRecents);

  const resolveLabel = React.useCallback(
    (item: { id: string; labelKey: string }): string => {
      switch (item.id) {
        case "nav-dashboard":
          return tNav("home" as never);
        case "nav-transactions":
          return tNav("transactions" as never);
        case "nav-invoices":
          return tNav("invoices" as never);
        case "nav-goals":
          return t("navLabel.goals");
        case "nav-reminders":
          return tNav("reminders" as never);
        case "nav-accounts":
          return tNav("accounts" as never);
        case "nav-settings":
          return tNav("settings" as never);
        case "action-new-transaction":
          return t("actions.newTransaction");
        case "action-new-invoice":
          return t("actions.newInvoice");
        case "action-new-goal":
          return t("actions.newGoal");
        case "action-new-reminder":
          return t("actions.newReminder");
        case "help-support":
          return t("help.helpCenter");
        default:
          return item.labelKey;
      }
    },
    [t, tNav]
  );

  const resolveSection = React.useCallback(
    (key: string): string => t(`sections.${key}` as never),
    [t]
  );

  const groups = React.useMemo(
    () => buildGroups(query, recents, resolveLabel, resolveSection),
    [query, recents, resolveLabel, resolveSection]
  );

  const flatItems = React.useMemo(
    () => groups.flatMap((group) => group.items),
    [groups]
  );

  const resolveShortcut = React.useCallback(
    (item: CommandItem): string | undefined => {
      if (!item.shortcutKey) return undefined;
      return t(`actions.${item.shortcutKey}` as never);
    },
    [t]
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
        section: item.sectionKey,
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
        aria-label={t("openPalette")}
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
          <DialogTitle className="sr-only">{t("title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("description")}
          </DialogDescription>
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              aria-label={t("searchAriaLabel")}
              autoComplete="off"
            />
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
              ESC
            </kbd>
          </div>

          <div
            className="min-h-[12rem] overflow-y-auto p-2"
            role="listbox"
            aria-label={t("listAriaLabel")}
          >
            {flatItems.length === 0 && (
              <div className="flex h-32 flex-col items-center justify-center gap-1 px-6 text-center text-muted-foreground" role="status" aria-live="polite">
                <Search className="h-6 w-6 opacity-40" aria-hidden="true" />
                <p className="text-sm">{t("noResults")}</p>
                <p className="text-xs">{t("tryAgain")}</p>
              </div>
            )}

            {groups.map((group) => (
              <div key={group.headingKey} className="mt-2 first:mt-0">
                <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {resolveSection(group.headingKey)}
                </h3>
                <ul className="space-y-0.5" role="group" aria-label={resolveSection(group.headingKey)}>
                  {group.items.map((item) => {
                    const globalIndex = flatItems.indexOf(item);
                    const isSelected = globalIndex === selectedIndex;
                    const Icon = item.icon;
                    return (
                      <li key={`${group.headingKey}-${item.id}`} role="none">
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
                            {resolveLabel(item)}
                          </span>
                          {item.shortcutKey && (
                            <span
                              className={cn(
                                "hidden text-xs sm:inline",
                                isSelected
                                  ? "text-primary-foreground/80"
                                  : "text-muted-foreground"
                              )}
                            >
                              {resolveShortcut(item)}
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
              <span className="hidden sm:inline">{t("commandsCount", { count: flatItems.length })}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">{t("navHint")}</span>
              <span className="hidden sm:inline">{t("executeHint")}</span>
              <span className="hidden sm:inline">{t("closeHint")}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
