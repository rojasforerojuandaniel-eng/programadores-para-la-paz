"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
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
  Menu,
  LogOut,
  TrendingUp,
  Globe,
  Calendar,
  Trophy,
  Medal,
  Calculator,
  Link as LinkIcon,
  Bell,
  X,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScopeToggle } from "./scope-toggle";
import { useScope } from "@/lib/scope-context";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const allNavItems = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const },
  { href: "/dashboard/personal/net-worth", label: "Patrimonio", icon: Wallet, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/personal/investments", label: "Inversiones", icon: TrendingUp, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/personal/subscriptions", label: "Suscripciones", icon: CreditCard, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/personal/calendar", label: "Calendario", icon: Calendar, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/personal/scenarios", label: "Escenarios", icon: Calculator, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/personal/achievements", label: "Logros", icon: Trophy, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/transactions", label: "Transacciones", icon: ArrowLeftRight, scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const },
  { href: "/dashboard/accounts", label: "Cuentas bancarias", icon: Landmark, scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const },
  { href: "/dashboard/invoices", label: "Facturas", icon: FileText, scopes: ["BUSINESS", "BOTH"] as const },
  { href: "/dashboard/clients", label: "Clientes", icon: Users, scopes: ["BUSINESS", "BOTH"] as const },
  { href: "/dashboard/tax", label: "Impuestos", icon: ShieldCheck, scopes: ["BUSINESS", "BOTH"] as const },
  { href: "/dashboard/payment-links", label: "Cobros", icon: CreditCard, scopes: ["BUSINESS", "BOTH"] as const },
  { href: "/dashboard/advisor", label: "AI Advisor", icon: Brain, scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const },
  { href: "/dashboard/economic-indicators", label: "Indicadores", icon: Globe, scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const },
  { href: "/dashboard/integrations", label: "Integraciones", icon: LinkIcon, scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Medal, scopes: ["PERSONAL", "BOTH"] as const },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings, scopes: ["PERSONAL", "BUSINESS", "BOTH"] as const },
];

function useFilteredNavItems() {
  const { scope } = useScope();
  return allNavItems.filter((item) => (item.scopes as readonly string[]).includes(scope));
}

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  const items = useFilteredNavItems();

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function UserSection({ mobile = false }: { mobile?: boolean }) {
  const { user } = useUser();
  const { signOut } = useClerk();

  if (!user) return null;

  const initials =
    user.firstName?.[0] || user.lastName?.[0] || user.emailAddresses?.[0]?.emailAddress?.[0] || "?";

  return (
    <div className={cn("border-t border-border", mobile ? "p-4" : "p-4")}>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initials.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {user.fullName || user.primaryEmailAddress?.emailAddress || "Usuario"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {user.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        className="h-10 w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        onClick={() => signOut({ redirectUrl: "/" })}
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </Button>
    </div>
  );
}


function MobileHeader() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/notifications/unread-count");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count ?? 0);
        }
      } catch {
        // Silently ignore
      }
    }
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/90 px-3 backdrop-blur-md lg:hidden">
      <Logo href="/dashboard" />
      <div className="flex min-w-0 shrink items-center gap-0.5">
        <div className="hidden min-w-0 shrink sm:block">
          <ScopeToggle />
        </div>
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Notificaciones" className="relative h-10 w-10">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium text-danger-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const { scope } = useScope();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isPersonal = scope === "PERSONAL" || scope === "BOTH";
  const isBusiness = scope === "BUSINESS" || scope === "BOTH";

  const tabs = [
    { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
    isBusiness
      ? { href: "/dashboard/invoices", label: "Facturas", icon: FileText }
      : { href: "/dashboard/accounts", label: "Cuentas", icon: Landmark },
    isPersonal
      ? { href: "/dashboard/transactions", label: "Movimientos", icon: ArrowLeftRight }
      : { href: "/dashboard/clients", label: "Clientes", icon: Users },
    { href: "#menu", label: "Menú", icon: Menu, sheet: true },
  ];

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-safe pt-1 backdrop-blur-md lg:hidden">
        <div className="grid h-[calc(3.5rem+env(safe-area-inset-bottom))] min-h-14 grid-cols-4 items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = !tab.sheet && (pathname === tab.href || pathname?.startsWith(`${tab.href}/`));
            return tab.sheet ? (
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen} key={tab.label}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-lg px-1 text-xs font-medium transition-colors",
                      sheetOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    <span>{tab.label}</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85dvh] max-h-[85dvh] rounded-t-2xl border-border bg-background p-0">
                  <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between border-b border-border p-4">
                      <Logo href="/dashboard" />
                      <Button variant="ghost" size="icon" onClick={() => setSheetOpen(false)} aria-label="Cerrar menú de navegación" className="h-10 w-10">
                        <X className="h-5 w-5" aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="px-4 pb-2 pt-4">
                      <ScopeToggle />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <NavLinks onClick={() => setSheetOpen(false)} />
                    </div>
                    <UserSection mobile />
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1.5 rounded-lg px-1 text-xs font-medium transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-6 w-6" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export function Sidebar() {
  return (
    <>
      <MobileHeader />
      <BottomNav />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center px-6">
            <Logo href="/dashboard" />
          </div>
          <div className="px-6 pb-2">
            <ScopeToggle />
          </div>
          <NavLinks />
          <div className="mt-auto space-y-2 border-t border-border p-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-muted-foreground">Tema</span>
              <ThemeToggle />
            </div>
            <UserSection />
          </div>
        </div>
      </aside>
    </>
  );
}
