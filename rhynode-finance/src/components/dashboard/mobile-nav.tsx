"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ArrowLeftRight,
  Landmark,
  TrendingUp,
  Wallet,
  Menu,
  X,
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
import { Logo } from "@/components/logo";
import { useScope } from "@/lib/scope-context";
import { NavLinks } from "./nav-links";
import { DashboardLocaleSwitcher } from "./locale-switcher";
import { UserSection } from "./user-section";

const MORE_MENU_ID = "mobile-more-menu";

interface MobileNavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

function MobileMoreSheet({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="bottom"
        id={MORE_MENU_ID}
        className="h-[85dvh] max-h-[85dvh] rounded-t-2xl border-border bg-background p-0"
      >
        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border p-4">
            <Logo href="/dashboard" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú de navegación"
              className="h-10 w-10"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
          <div className="px-4 pb-2 pt-4">
            <ScopeToggle />
          </div>
          <div className="flex items-center justify-end px-4 pb-2">
            <DashboardLocaleSwitcher />
          </div>
          <div className="flex-1 overflow-y-auto">
            <NavLinks onClick={() => setOpen(false)} />
          </div>
          <UserSection mobile />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const { scope } = useScope();

  const isPersonal = scope === "PERSONAL" || scope === "BOTH";
  const isBusiness = scope === "BUSINESS" || scope === "BOTH";

  const tabs: MobileNavItem[] = [
    { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
    isPersonal
      ? { href: "/dashboard/personal", label: "Personal", icon: Wallet }
      : { href: "/dashboard/accounts", label: "Cuentas", icon: Landmark },
    { href: "/dashboard/transactions", label: "Transacciones", icon: ArrowLeftRight },
    isBusiness
      ? { href: "/dashboard/invoices", label: "Facturas", icon: FileText }
      : { href: "/dashboard/personal/investments", label: "Inversiones", icon: TrendingUp },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-md lg:hidden"
      aria-label="Navegación principal móvil"
    >
      <div className="grid h-14 min-h-14 grid-cols-5 items-center">
        <ul className="contents">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
            return (
              <li key={tab.href} className="contents">
                <Link
                  href={tab.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                  <span>{tab.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="contents">
            <MobileMoreSheet>
              <button
                type="button"
                className={cn(
                  "flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  "text-muted-foreground hover:text-foreground",
                )}
                aria-haspopup="dialog"
                aria-controls={MORE_MENU_ID}
                aria-label="Abrir menú de navegación"
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
                <span>Más</span>
              </button>
            </MobileMoreSheet>
          </li>
        </ul>
      </div>
    </nav>
  );
}
