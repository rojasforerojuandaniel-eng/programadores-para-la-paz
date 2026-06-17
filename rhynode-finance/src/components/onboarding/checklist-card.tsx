"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
    label: "Completa tu perfil",
    description: "Añade tu nombre y configura tu país y moneda.",
    icon: User,
    href: "/dashboard/settings",
    action: "Configurar",
  },
  {
    id: "connect-bank",
    label: "Conecta una cuenta bancaria",
    description: "Empieza a sincronizar tus movimientos (próximamente).",
    icon: Landmark,
    href: "/dashboard/accounts",
    action: "Conectar",
  },
  {
    id: "create-goal",
    label: "Crea tu primera meta",
    description: "Define un objetivo de ahorro o pago.",
    icon: Target,
    href: "/dashboard/personal/goals",
    action: "Crear meta",
  },
  {
    id: "add-transaction",
    label: "Añade tu primera transacción",
    description: "Registra un ingreso o gasto para ver tu panorama.",
    icon: ArrowLeftRight,
    href: "/dashboard/transactions",
    action: "Añadir",
  },
  {
    id: "explore-dashboard",
    label: "Explora el dashboard",
    description: "Conoce tu panorama financiero.",
    icon: LayoutDashboard,
    href: "/dashboard",
    action: "Explorar",
  },
] as const;

const STORAGE_KEY = "rhynode_onboarding_checklist";

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
  const [items, setItems] = useState<Record<string, boolean>>(() => {
    const stored = (() => {
      if (typeof window === "undefined") return null;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Record<string, boolean>) : null;
      } catch {
        return null;
      }
    })();
    return {
      ...defaultItems(),
      ...initialItems,
      ...stored,
    };
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

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore localStorage errors
    }

    setPending(true);
    try {
      const res = await fetch("/api/onboarding/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: { [id]: next[id] } }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error || "No se pudo guardar el progreso.");
      }
    } catch {
      toast.error("Error de red. El cambio se guardó localmente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Activa tu Rhynode</CardTitle>
        <CardDescription>
          Completa estos pasos para sacarle el máximo provecho.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              {percentage}% completado
            </span>
            <span className="text-muted-foreground">
              {done} de {total}
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

        <ul className="space-y-2" role="list" aria-label="Pasos de activación">
          {CHECKLIST_ITEMS.map((item) => {
            const completed = items[item.id] ?? false;
            const Icon = item.icon;
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
                    aria-label={`${completed ? "Desmarcar" : "Marcar"} ${item.label}`}
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
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 gap-1 px-2 text-xs"
                  >
                    <Link href={item.href}>
                      {item.action}
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
