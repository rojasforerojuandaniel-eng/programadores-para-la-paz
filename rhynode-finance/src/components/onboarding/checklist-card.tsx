"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  User,
  Landmark,
  Target,
  ArrowLeftRight,
  LayoutDashboard,
  Check,
  ChevronRight,
} from "lucide-react";

const CHECKLIST_ITEMS = [
  {
    id: "complete-profile",
    icon: User,
    href: "/dashboard/settings",
  },
  {
    id: "connect-bank",
    icon: Landmark,
    href: "/dashboard/accounts",
  },
  {
    id: "create-goal",
    icon: Target,
    href: "/dashboard/personal/goals",
  },
  {
    id: "add-transaction",
    icon: ArrowLeftRight,
    href: "/dashboard/transactions",
  },
  {
    id: "explore-dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
] as const;

function defaultItems(): Record<string, boolean> {
  return CHECKLIST_ITEMS.reduce(
    (acc, item) => {
      acc[item.id] = false;
      return acc;
    },
    {} as Record<string, boolean>,
  );
}

export interface ChecklistCardProps {
  initialItems?: Record<string, boolean>;
}

export function ChecklistCard({ initialItems }: ChecklistCardProps) {
  const t = useTranslations("onboarding.checklist");
  const [items, setItems] = useState<Record<string, boolean>>({
    ...defaultItems(),
    ...initialItems,
  });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!initialItems) {
      fetch("/api/onboarding/progress")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: unknown) => {
          if (
            data &&
            typeof data === "object" &&
            "items" in data &&
            data.items &&
            typeof data.items === "object"
          ) {
            setItems((prev) => ({
              ...prev,
              ...(data.items as Record<string, boolean>),
            }));
          }
        })
        .catch(() => null);
    }
  }, [initialItems]);

  const { done, total, percentage } = useMemo(() => {
    const total = CHECKLIST_ITEMS.length;
    const done = CHECKLIST_ITEMS.filter((item) => items[item.id]).length;
    return { done, total, percentage: Math.round((done / total) * 100) };
  }, [items]);

  async function toggle(id: string) {
    const next = { ...items, [id]: !items[id] };
    setItems(next);

    setPending(true);
    try {
      const res = await fetch("/api/onboarding/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: { [id]: next[id] } }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error || t("saveError"));
      }
    } catch {
      toast.error(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>
          {t("subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              {t("progress", { percentage })}
            </span>
            <span className="text-muted-foreground">
              {t("doneOfTotal", { done, total })}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${percentage}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        <ul className="space-y-2" role="list" aria-label={t("stepsAriaLabel")}>
          {CHECKLIST_ITEMS.map((item) => {
            const completed = items[item.id] ?? false;
            const Icon = item.icon;
            const label = t(`items.${item.id}.label`);
            return (
              <li key={item.id}>
                <div
                  className={cn(
                    "group flex items-start gap-3 rounded-lg border p-3 transition-colors",
                    completed
                      ? "border-primary/20 bg-primary/5"
                      : "border-border bg-card hover:bg-muted/50",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    disabled={pending}
                    role="checkbox"
                    aria-checked={completed}
                    aria-label={`${completed ? t("unmark") : t("mark")} ${label}`}
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                      completed
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 hover:border-primary",
                    )}
                  >
                    {completed && (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "flex items-center gap-2 text-sm font-medium",
                        completed && "text-muted-foreground line-through",
                      )}
                    >
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                      {label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`items.${item.id}.description`)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 gap-1 px-2 text-xs"
                  >
                    <Link href={item.href}>
                      {t(`items.${item.id}.action`)}
                      <ChevronRight
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}