"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ArrowLeftRight,
  Users,
  ShieldCheck,
  CreditCard,
  Landmark,
  Settings,
  Brain,
  TrendingUp,
  Globe,
  Calendar,
  Trophy,
  Medal,
  BarChart3,
  Calculator,
  Bell,
  Link as LinkIcon,
  Wallet,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useScope } from "@/lib/scope-context";

export const allNavItems = [
  {
    href: "/dashboard",
    label: "Inicio",
    icon: LayoutDashboard,
    scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const,
  },
  {
    href: "/dashboard/personal/net-worth",
    label: "Patrimonio",
    icon: Wallet,
    scopes: ["PERSONAL", "BOTH"] as const,
  },
  {
    href: "/dashboard/personal/investments",
    label: "Inversiones",
    icon: TrendingUp,
    scopes: ["PERSONAL", "BOTH"] as const,
  },
  {
    href: "/dashboard/personal/subscriptions",
    label: "Suscripciones",
    icon: CreditCard,
    scopes: ["PERSONAL", "BOTH"] as const,
  },
  {
    href: "/dashboard/personal/calendar",
    label: "Calendario",
    icon: Calendar,
    scopes: ["PERSONAL", "BOTH"] as const,
  },
  {
    href: "/dashboard/personal/reminders",
    label: "Recordatorios",
    icon: Bell,
    scopes: ["PERSONAL", "BOTH"] as const,
  },
  {
    href: "/dashboard/personal/scenarios",
    label: "Escenarios",
    icon: Calculator,
    scopes: ["PERSONAL", "BOTH"] as const,
  },
  {
    href: "/dashboard/personal/split",
    label: "Dividir Gastos",
    icon: Users,
    scopes: ["PERSONAL", "BOTH"] as const,
  },
  {
    href: "/dashboard/personal/rent-declaration",
    label: "Declaración Renta",
    icon: FileText,
    scopes: ["PERSONAL", "BOTH"] as const,
  },
  {
    href: "/dashboard/personal/achievements",
    label: "Logros",
    icon: Trophy,
    scopes: ["PERSONAL", "BOTH"] as const,
  },
  {
    href: "/dashboard/transactions",
    label: "Transacciones",
    icon: ArrowLeftRight,
    scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const,
  },
  {
    href: "/dashboard/rules",
    label: "Reglas",
    icon: Workflow,
    scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const,
  },
  {
    href: "/dashboard/accounts",
    label: "Cuentas bancarias",
    icon: Landmark,
    scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const,
  },
  {
    href: "/dashboard/invoices",
    label: "Facturas",
    icon: FileText,
    scopes: ["BUSINESS", "BOTH"] as const,
  },
  {
    href: "/dashboard/clients",
    label: "Clientes",
    icon: Users,
    scopes: ["BUSINESS", "BOTH"] as const,
  },
  {
    href: "/dashboard/tax",
    label: "Impuestos",
    icon: ShieldCheck,
    scopes: ["BUSINESS", "BOTH"] as const,
  },
  {
    href: "/dashboard/payment-links",
    label: "Cobros",
    icon: CreditCard,
    scopes: ["BUSINESS", "BOTH"] as const,
  },
  {
    href: "/dashboard/advisor",
    label: "AI Advisor",
    icon: Brain,
    scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const,
  },
  {
    href: "/dashboard/economic-indicators",
    label: "Indicadores",
    icon: Globe,
    scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const,
  },
  {
    href: "/dashboard/integrations",
    label: "Integraciones",
    icon: LinkIcon,
    scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const,
  },
  {
    href: "/dashboard/leaderboard",
    label: "Leaderboard",
    icon: Medal,
    scopes: ["PERSONAL", "BOTH"] as const,
  },
  {
    href: "/dashboard/stats",
    label: "Mis stats",
    icon: BarChart3,
    scopes: ["PERSONAL", "BOTH"] as const,
  },
  {
    href: "/dashboard/settings",
    label: "Configuración",
    icon: Settings,
    scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const,
  },
];

function useFilteredNavItems() {
  const { scope } = useScope();
  return allNavItems.filter((item) =>
    (item.scopes as readonly string[]).includes(scope),
  );
}

export function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  const items = useFilteredNavItems();

  return (
    <nav className="flex-1 px-3 py-4" aria-label="Secciones del dashboard">
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClick}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
