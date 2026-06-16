"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ArrowLeftRight, FileText, TrendingUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateTransactionSheet } from "@/components/dashboard/create-transaction-sheet";
import { CreateInvoiceSheet } from "@/components/dashboard/create-invoice-sheet";
import { CreateInvestmentDialog } from "@/app/dashboard/personal/investments/create-dialog";
import { CreateBudgetDialog } from "@/app/dashboard/personal/budgets/create-dialog";

interface QuickActionItem {
  id: string;
  label: string;
  icon: React.ElementType;
  dialog: React.ReactNode;
}

export function QuickActionsFab() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleCreated = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setOpen(false);
  }, []);

  const actions: QuickActionItem[] = [
    {
      id: "transaction",
      label: "Nueva transacción",
      icon: ArrowLeftRight,
      dialog: (
        <CreateTransactionSheet
          onCreate={handleCreated}
          trigger={
            <QuickActionButton
              icon={ArrowLeftRight}
              label="Nueva transacción"
              onClick={handleCloseMenu}
            />
          }
        />
      ),
    },
    {
      id: "invoice",
      label: "Nueva factura",
      icon: FileText,
      dialog: (
        <CreateInvoiceSheet
          onCreate={handleCreated}
          trigger={
            <QuickActionButton
              icon={FileText}
              label="Nueva factura"
              onClick={handleCloseMenu}
            />
          }
        />
      ),
    },
    {
      id: "investment",
      label: "Nueva inversión",
      icon: TrendingUp,
      dialog: (
        <CreateInvestmentDialog
          trigger={
            <QuickActionButton
              icon={TrendingUp}
              label="Nueva inversión"
              onClick={handleCloseMenu}
            />
          }
        />
      ),
    },
    {
      id: "budget",
      label: "Nuevo presupuesto",
      icon: Wallet,
      dialog: (
        <CreateBudgetDialog
          trigger={
            <QuickActionButton
              icon={Wallet}
              label="Nuevo presupuesto"
              onClick={handleCloseMenu}
            />
          }
        />
      ),
    },
  ];

  return (
    <div className="fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-end gap-3 lg:hidden">
      {/* Menu */}
      <div
        className={cn(
          "mb-2 flex flex-col items-end gap-2 transition-all duration-200 ease-out",
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible translate-y-4 opacity-0 pointer-events-none"
        )}
        aria-hidden={!open}
      >
        {actions.map((action) => (
          <div
            key={action.id}
            className={cn(
              "flex items-center gap-3 transition-all duration-200 ease-out",
              open ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
            )}
          >
            <span className="rounded-md bg-background px-2 py-1 text-xs font-medium shadow-sm ring-1 ring-border">
              {action.label}
            </span>
            {action.dialog}
          </div>
        ))}
      </div>

      {/* Backdrop */}
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-[-1] bg-black/20 backdrop-blur-[1px] transition-opacity duration-200"
          onClick={handleCloseMenu}
          aria-label="Cerrar menú de acciones rápidas"
        />
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={open ? "Cerrar acciones rápidas" : "Abrir acciones rápidas"}
        aria-expanded={open}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          open ? "rotate-45 bg-muted text-foreground hover:bg-muted/80" : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}

function QuickActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-foreground shadow-md ring-1 ring-border transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={label}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
