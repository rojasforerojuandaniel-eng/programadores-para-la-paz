"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Search,
  ArrowLeftRight,
  FileText,
  Users,
  Briefcase,
  Landmark,
  Loader2,
  CornerDownLeft,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
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

interface SearchResult {
  id: string;
  type: "transaction" | "invoice" | "client" | "project" | "account";
  title: string;
  subtitle: string;
  href: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

const typeMeta: Record<
  SearchResult["type"],
  { label: string; icon: React.ElementType }
> = {
  transaction: { label: "Transacciones", icon: ArrowLeftRight },
  invoice: { label: "Facturas", icon: FileText },
  client: { label: "Clientes", icon: Users },
  project: { label: "Proyectos", icon: Briefcase },
  account: { label: "Cuentas", icon: Landmark },
};

function groupResults(results: SearchResult[]) {
  const groups = new Map<SearchResult["type"], SearchResult[]>();
  for (const result of results) {
    const list = groups.get(result.type) ?? [];
    list.push(result);
    groups.set(result.type, list);
  }
  return groups;
}

function useSearchQuery() {
  const t = useTranslations("dashboard.search");
  const [query, setQueryState] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 200);
  const abortRef = React.useRef<AbortController | null>(null);
  const trackedRef = React.useRef<Set<string>>(new Set());

  const setQuery = React.useCallback(
    (value: string) => {
      setQueryState(value);
      if (value.trim().length < 2) {
        abortRef.current?.abort();
        abortRef.current = null;
        setResults([]);
        setLoading(false);
        setError(null);
      } else {
        setLoading(true);
        setError(null);
      }
    },
    []
  );

  React.useEffect(() => {
    if (debouncedQuery.trim().length < 2) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || t("searchError"));
        }
        return res.json() as Promise<SearchResponse>;
      })
      .then((data) => {
        setResults(data.results ?? []);
        if (!trackedRef.current.has(debouncedQuery)) {
          trackedRef.current.add(debouncedQuery);
          trackEvent("search_query", {
            queryLength: debouncedQuery.length,
            resultCount: data.results?.length ?? 0,
            hasResults: (data.results?.length ?? 0) > 0,
          });
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : t("searchError"));
        setResults([]);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, t]);

  return { query, setQuery, results, loading, error };
}

function useKeyboardNavigation(
  results: SearchResult[],
  onSelect: (result: SearchResult) => void,
  isOpen: boolean
) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const effectiveIndex =
    results.length === 0 ? -1 : Math.min(selectedIndex, results.length - 1);

  React.useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) =>
          results.length === 0 ? 0 : (prev + 1) % results.length
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) =>
          results.length === 0
            ? 0
            : (prev - 1 + results.length) % results.length
        );
      } else if (event.key === "Enter" && results.length > 0) {
        event.preventDefault();
        onSelect(results[effectiveIndex]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, effectiveIndex, onSelect]);

  return { selectedIndex: effectiveIndex, setSelectedIndex };
}

function EmptyState({ query, loading }: { query: string; loading: boolean }) {
  const t = useTranslations("dashboard.search");
  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span>{t("searching")}</span>
      </div>
    );
  }

  if (!query.trim()) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-1 px-6 text-center text-muted-foreground">
        <Search className="h-6 w-6 opacity-40" aria-hidden="true" />
        <p className="text-sm">{t("typeToSearch")}</p>
        <p className="text-xs">{t("typeToSearchHint")}</p>
      </div>
    );
  }

  return (
    <div
      className="flex h-32 flex-col items-center justify-center gap-1 px-6 text-center text-muted-foreground"
      aria-live="polite"
    >
      <Search className="h-6 w-6 opacity-40" aria-hidden="true" />
      <p className="text-sm">{t("noResults")}</p>
      <p className="text-xs">{t("noResultsHint")}</p>
    </div>
  );
}

export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("dashboard.search");
  const [isOpen, setIsOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const { query, setQuery, results, loading, error } = useSearchQuery();

  const handleSelect = React.useCallback(
    (result: SearchResult) => {
      setIsOpen(false);
      window.location.href = result.href;
    },
    [setIsOpen]
  );

  const { selectedIndex, setSelectedIndex } = useKeyboardNavigation(
    results,
    handleSelect,
    isOpen
  );

  React.useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "k") {
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

  const groups = React.useMemo(() => groupResults(results), [results]);
  let runningIndex = -1;

  return (
    <>
      {compact ? (
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => setIsOpen(true)}
          aria-label={t("openGlobalCompact")}
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </Button>
      ) : (
        <Button
          ref={triggerRef}
          variant="outline"
          className="relative h-9 w-full justify-start rounded-md bg-muted/50 text-sm font-normal text-muted-foreground shadow-none hover:bg-accent hover:text-foreground"
          onClick={() => setIsOpen(true)}
          aria-label={t("openGlobal")}
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{t("searchPlaceholder")}</span>
          <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      )}

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setSelectedIndex(0);
        }}
      >
        <DialogContent
          className="max-h-[80vh] gap-0 overflow-hidden p-0 sm:max-w-xl"
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
              placeholder={t("inputPlaceholder")}
              className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              aria-label={t("inputAriaLabel")}
              autoComplete="off"
            />
            {loading && (
              <Loader2
                className="h-4 w-4 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </div>

          <div
            className="min-h-[12rem] overflow-y-auto p-2"
            role="listbox"
            aria-label={t("resultsAriaLabel")}
            aria-live={loading ? "polite" : "off"}
          >
            {results.length === 0 && !error && (
              <EmptyState query={query} loading={loading} />
            )}

            {error && (
              <div className="flex h-32 flex-col items-center justify-center px-6 text-center text-destructive">
                <p className="text-sm font-medium">{error}</p>
                <p className="text-xs text-muted-foreground">{t("errorHint")}</p>
              </div>
            )}

            {Array.from(groups.entries()).map(([type, items]) => {
              const meta = typeMeta[type];
              const Icon = meta.icon;
              const groupLabel = t(`types.${type}` as never);
              return (
                <div key={type} className="mt-2 first:mt-0">
                  <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {groupLabel}
                  </h3>
                  <ul className="space-y-0.5" role="group" aria-label={groupLabel}>
                    {items.map((result) => {
                      runningIndex += 1;
                      const isSelected = runningIndex === selectedIndex;
                      return (
                        <li key={`${type}-${result.id}`} role="none">
                          <Link
                            href={result.href}
                            onClick={(e) => {
                              e.preventDefault();
                              handleSelect(result);
                            }}
                            onMouseEnter={() => setSelectedIndex(runningIndex)}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm outline-none transition-colors",
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
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{result.title}</p>
                              <p
                                className={cn(
                                  "truncate text-xs",
                                  isSelected
                                    ? "text-primary-foreground/80"
                                    : "text-muted-foreground"
                                )}
                              >
                                {result.subtitle}
                              </p>
                            </div>
                            {isSelected && (
                              <CornerDownLeft
                                className="h-4 w-4 shrink-0"
                                aria-hidden="true"
                              />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>{t("maxResults")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">{t("navHint")}</span>
              <span className="hidden sm:inline">{t("selectHint")}</span>
              <span className="sm:hidden">⌘K</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
