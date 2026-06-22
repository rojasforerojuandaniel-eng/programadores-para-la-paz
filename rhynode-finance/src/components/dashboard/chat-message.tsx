"use client";

import { Brain, User, Loader2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { formatNumber, formatDate as fmtDate } from "@/lib/format";
import type { Locale } from "@/lib/locale";

interface ChatMessageProps {
  role: "user" | "assistant" | "tool";
  content: string;
  isLoading?: boolean;
  toolName?: string;
  toolResult?: unknown;
}

export function ChatMessage({
  role,
  content,
  isLoading,
  toolName,
  toolResult,
}: ChatMessageProps) {
  const t = useTranslations("dashboard.ai");
  const locale = useLocale() as Locale;
  const isUser = role === "user";

  if (role === "tool") {
    return (
      <div className="flex animate-in fade-in slide-in-from-bottom-2 gap-3 duration-300">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Brain className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="max-w-[80%] space-y-2 rounded-2xl px-4 py-2.5 text-sm surface-elevated-2">
          {toolResult === undefined ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>
                {t("chat.usingTool")}{" "}
                <span className="font-medium text-foreground">{toolName}</span>…
              </span>
            </div>
          ) : (
            <ToolResultView toolName={toolName} result={toolResult} t={t} locale={locale} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex animate-in fade-in gap-3 duration-300",
        isUser ? "flex-row-reverse" : "flex-row",
        isUser ? "slide-in-from-bottom-2" : "slide-in-from-bottom-2"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary/10 text-primary"
            : "bg-accent text-accent-foreground",
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Brain className="h-4 w-4" aria-hidden="true" />
        )}
      </div>

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary/10 text-foreground"
            : "surface-elevated-2 text-foreground",
        )}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t("chat.thinking")}</span>
            <span className="flex gap-1">
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: "300ms" }}
              />
            </span>
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  );
}

export function ChatMessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div
      className={cn(
        "flex animate-in fade-in gap-3 duration-300",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary/10" : "bg-accent",
        )}
      />
      <div
        className={cn(
          "max-w-[80%] space-y-2 rounded-2xl px-4 py-2.5",
          isUser ? "bg-primary/10" : "surface-elevated-2",
        )}
      >
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function ToolResultView({
  toolName,
  result,
  t,
  locale,
}: {
  toolName?: string;
  result: unknown;
  t: ReturnType<typeof useTranslations>;
  locale: Locale;
}) {
  if (!isObject(result)) {
    return (
      <div className="text-xs text-muted-foreground">
        {toolName ? (
          <span className="font-medium text-foreground">{toolName}</span>
        ) : null}
        <pre className="mt-1 whitespace-pre-wrap">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    );
  }

  const entries = Object.entries(result).filter(([key]) => key !== "success");

  return (
    <div className="space-y-2">
      {toolName ? (
        <p className="font-medium text-foreground">
          {t("chat.toolResult")} <span className="text-primary">{toolName}</span>
        </p>
      ) : null}
      <div className="space-y-1.5">
        {entries.map(([key, value]) => (
          <div key={key}>
            <p className="text-xs font-medium text-muted-foreground capitalize">
              {formatKey(key)}
            </p>
            <ValueView value={value} t={t} locale={locale} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ValueView({
  value,
  t,
  locale,
}: {
  value: unknown;
  t: ReturnType<typeof useTranslations>;
  locale: Locale;
}) {
  if (Array.isArray(value) && value.length > 0 && isObject(value[0])) {
    return (
      <ul className="mt-1 space-y-1 text-xs">
        {value.map((item, index) => (
          <li key={index} className="rounded-md border border-border/50 p-2">
            {isObject(item) ? (
              <div className="space-y-1">
                {Object.entries(item)
                  .filter(([k]) => !k.toLowerCase().includes("id"))
                  .map(([k, v]) => (
                    <div key={k}>
                      <span className="text-muted-foreground">
                        {formatKey(k)}:{" "}
                      </span>
                      <span className="font-medium">{formatValue(v, t, locale)}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <span>{formatValue(item, t, locale)}</span>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return <p className="text-sm font-medium">{formatValue(value, t, locale)}</p>;
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .toLowerCase();
}

function formatValue(
  value: unknown,
  t: ReturnType<typeof useTranslations>,
  locale: Locale,
): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? t("chat.yes") : t("chat.no");
  if (typeof value === "number") return formatNumber(value, locale);
  if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return fmtDate(value, locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
