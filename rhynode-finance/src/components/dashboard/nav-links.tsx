"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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
  { href: "/dashboard", labelKey: "home", icon: LayoutDashboard, scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const },
  { href: "/dashboard/personal/net-worth", labelKey: "netWorth", icon: Wallet, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/personal/investments", labelKey: "investments", icon: TrendingUp, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/personal/subscriptions", labelKey: "subscriptions", icon: CreditCard, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/personal/calendar", labelKey: "calendar", icon: Calendar, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/personal/reminders", labelKey: "reminders", icon: Bell, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/personal/scenarios", labelKey: "scenarios", icon: Calculator, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/personal/split", labelKey: "split", icon: Users, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/personal/rent-declaration", labelKey: "rentDeclaration", icon: FileText, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/personal/achievements", labelKey: "achievements", icon: Trophy, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/transactions", labelKey: "transactions", icon: ArrowLeftRight, scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const },
  { href: "/dashboard/rules", labelKey: "rules", icon: Workflow, scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const },
  { href: "/dashboard/accounts", labelKey: "accounts", icon: Landmark, scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const },
  { href: "/dashboard/invoices", labelKey: "invoices", icon: FileText, scopes: ["BUSINESS", "BOTH"] as const },
  { href: "/dashboard/clients", labelKey: "clients", icon: Users, scopes: ["BUSINESS", "BOTH"] as const },
  { href: "/dashboard/tax", labelKey: "tax", icon: ShieldCheck, scopes: ["BUSINESS", "BOTH"] as const },
  { href: "/dashboard/payment-links", labelKey: "paymentLinks", icon: CreditCard, scopes: ["BUSINESS", "BOTH"] as const },
  { href: "/dashboard/advisor", labelKey: "advisor", icon: Brain, scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const },
  { href: "/dashboard/economic-indicators", labelKey: "indicators", icon: Globe, scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const },
  { href: "/dashboard/integrations", labelKey: "integrations", icon: LinkIcon, scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const },
  { href: "/dashboard/leaderboard", labelKey: "leaderboard", icon: Medal, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/stats", labelKey: "stats", icon: BarChart3, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/settings", labelKey: "settings", icon: Settings, scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const },
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
  const t = useTranslations("dashboard.nav");
  const tDashboard = useTranslations("dashboard");

  return (
    <nav className="flex-1 px-3 py-4" aria-label={tDashboard("sectionsAria")}>
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
                <span className="truncate">{t(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}