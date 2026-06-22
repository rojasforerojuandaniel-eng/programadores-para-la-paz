"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { QuickAdd } from "./quick-add";
import { VoiceAddButton } from "./voice-add-button";
import { UserSection } from "./user-section";

const MORE_MENU_ID = "mobile-more-menu";

interface MobileNavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

function MobileMoreSheet({ children }: { children: React.ReactNode }) {
  const t = useTranslations("dashboard.nav");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="bottom"
        id={MORE_MENU_ID}
        className="h-[85dvh] max-h-[85dvh] rounded-t-2xl border-border bg-background p-0"
      >
        <SheetTitle className="sr-only">{t("mobileNav.menuTitle")}</SheetTitle>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border p-4">
            <Logo href="/dashboard" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label={t("mobileNav.closeMenu")}
              className="h-10 w-10"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
          <div className="px-4 pb-2 pt-4">
            <QuickAdd />
          </div>
          <div className="px-4 pb-3">
            <VoiceAddButton />
          </div>
          <div className="px-4 pb-2">
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
  const t = useTranslations("dashboard.nav");
  const pathname = usePathname();
  const { scope } = useScope();

  const isPersonal = scope === "PERSONAL" || scope === "BOTH";
  const isBusiness = scope === "BUSINESS" || scope === "BOTH";

  const tabs: MobileNavItem[] = [
    { href: "/dashboard", label: t("home" as never), icon: LayoutDashboard },
    isPersonal
      ? { href: "/dashboard/personal", label: t("mobileNav.personal" as never), icon: Wallet }
      : { href: "/dashboard/accounts", label: t("accounts" as never), icon: Landmark },
    { href: "/dashboard/transactions", label: t("transactions" as never), icon: ArrowLeftRight },
    isBusiness
      ? { href: "/dashboard/invoices", label: t("invoices" as never), icon: FileText }
      : { href: "/dashboard/personal/investments", label: t("investments" as never), icon: TrendingUp },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-md lg:hidden"
      aria-label={t("mobileNav.navAriaLabel")}
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
                aria-label={t("mobileNav.openMenu")}
              >
                <Menu className="h-6 w-6" aria-hidden="true" />
                <span>{t("mobileNav.more")}</span>
              </button>
            </MobileMoreSheet>
          </li>
        </ul>
      </div>
    </nav>
  );
}
