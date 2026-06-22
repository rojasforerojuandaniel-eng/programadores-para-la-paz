"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";
import { forwardRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, ArrowLeftRight, FileText, Target, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateTransactionSheet } from "@/components/dashboard/create-transaction-sheet";
import { CreateInvoiceSheet } from "@/components/dashboard/create-invoice-sheet";
import { CreateGoalDialog } from "@/app/dashboard/personal/goals/create-dialog";
import { CreateBudgetDialog } from "@/app/dashboard/personal/budgets/create-dialog";

interface QuickActionItem {
  id: string;
  label: string;
  icon: ElementType;
  dialog: ReactNode;
}

const MENU_ID = "quick-actions-menu";

export function QuickActionsFab() {
  const t = useTranslations("dashboard.quickAdd");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const fabRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleCreated = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleCloseMenu = useCallback(() => {
    setOpen(false);
  }, []);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      const first = itemRefs.current[0];
      if (first) first.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open && fabRef.current) {
      const wasInside = itemRefs.current.some(
        (item) => item === document.activeElement
      );
      if (wasInside) {
        fabRef.current.focus();
      }
    }
  }, [open]);

  const setItemRef = useCallback(
    (index: number) => (el: HTMLButtonElement | null) => {
      itemRefs.current[index] = el;
    },
    []
  );

  const labelId = useCallback((id: string) => `${id}-label`, []);

  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!open) return;
      const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
      if (items.length === 0) return;
      const currentIndex = items.findIndex(
        (item) => item === document.activeElement
      );
      if (currentIndex === -1) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        items[(currentIndex + 1) % items.length].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        items[(currentIndex - 1 + items.length) % items.length].focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        items[0].focus();
      } else if (e.key === "End") {
        e.preventDefault();
        items[items.length - 1].focus();
      }
    },
    [open]
  );

  const actions: QuickActionItem[] = [
    {
      id: "transaction",
      label: t("fab.newTransaction"),
      icon: ArrowLeftRight,
      dialog: (
        <CreateTransactionSheet
          onCreate={handleCreated}
          trigger={
            <QuickActionButton
              ref={setItemRef(0)}
              icon={ArrowLeftRight}
              label={t("fab.newTransaction")}
              labelledBy={labelId("transaction")}
              onClick={handleCloseMenu}
            />
          }
        />
      ),
    },
    {
      id: "invoice",
      label: t("fab.newInvoice"),
      icon: FileText,
      dialog: (
        <CreateInvoiceSheet
          onCreate={handleCreated}
          trigger={
            <QuickActionButton
              ref={setItemRef(1)}
              icon={FileText}
              label={t("fab.newInvoice")}
              labelledBy={labelId("invoice")}
              onClick={handleCloseMenu}
            />
          }
        />
      ),
    },
    {
      id: "goal",
      label: t("fab.newGoal"),
      icon: Target,
      dialog: (
        <CreateGoalDialog
          trigger={
            <QuickActionButton
              ref={setItemRef(2)}
              icon={Target}
              label={t("fab.newGoal")}
              labelledBy={labelId("goal")}
              onClick={handleCloseMenu}
            />
          }
        />
      ),
    },
    {
      id: "budget",
      label: t("fab.newBudget"),
      icon: Wallet,
      dialog: (
        <CreateBudgetDialog
          trigger={
            <QuickActionButton
              ref={setItemRef(3)}
              icon={Wallet}
              label={t("fab.newBudget")}
              labelledBy={labelId("budget")}
              onClick={handleCloseMenu}
            />
          }
        />
      ),
    },
  ];

  return (
    <>
      <div
        role="presentation"
        aria-hidden="true"
        onClick={handleCloseMenu}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      <div className="fixed right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-end lg:hidden">
        <div
          id={MENU_ID}
          role="menu"
          aria-label={t("fab.menuAriaLabel")}
          aria-orientation="vertical"
          aria-hidden={!open}
          onKeyDown={handleMenuKeyDown}
          className={cn(
            "mb-3 flex flex-col items-end gap-3 transition-opacity duration-300 ease-out",
            open ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {actions.map((action, index) => (
            <div
              key={action.id}
              className={cn(
                "flex items-center gap-3 transition-all duration-300 ease-out",
                open
                  ? "translate-y-0 opacity-100 scale-100"
                  : "translate-y-2 opacity-0 scale-90 pointer-events-none"
              )}
              style={{ transitionDelay: open ? `${index * 60}ms` : "0ms" }}
            >
              <span
                id={labelId(action.id)}
                className="rounded-md bg-background px-2 py-1 text-xs font-medium text-foreground shadow-sm ring-1 ring-border"
              >
                {action.label}
              </span>
              {action.dialog}
            </div>
          ))}
        </div>

        <button
          ref={fabRef}
          type="button"
          onClick={handleToggle}
          aria-label={open ? t("fab.closeActions") : t("fab.openActions")}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={MENU_ID}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            open
              ? "bg-muted text-foreground hover:bg-muted/80"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          <Plus
            className={cn(
              "h-6 w-6 transition-transform duration-300 ease-out",
              open && "rotate-45"
            )}
            aria-hidden="true"
          />
        </button>
      </div>
    </>
  );
}

interface QuickActionButtonProps {
  icon: ElementType;
  label: string;
  labelledBy?: string;
  onClick?: () => void;
}

const QuickActionButton = forwardRef<HTMLButtonElement, QuickActionButtonProps>(
  function QuickActionButton({ icon: Icon, label, labelledBy, onClick }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        role="menuitem"
        onClick={onClick}
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-foreground shadow-md ring-1 ring-border transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </button>
    );
  }
);
QuickActionButton.displayName = "QuickActionButton";
