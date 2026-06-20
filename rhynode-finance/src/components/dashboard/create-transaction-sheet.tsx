"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-media-query";
import { CreateTransactionDialog } from "@/components/dashboard/create-transaction-dialog";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@/components/ui/bottom-sheet";
import { TransactionForm } from "@/components/dashboard/transaction-form";
import { useOrganizationRole } from "@/hooks/use-organization-role";

interface CreateTransactionSheetProps {
  onCreate: () => void;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  /** Controlled open state (used by the voice input to open after parsing). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultType?: "INCOME" | "EXPENSE" | "TRANSFER" | "ADJUSTMENT";
  defaultAmount?: string;
  defaultDescription?: string;
  defaultCategory?: string;
}

export function CreateTransactionSheet({
  onCreate,
  trigger,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  defaultType,
  defaultAmount,
  defaultDescription,
  defaultCategory,
}: CreateTransactionSheetProps) {
  const { canEdit } = useOrganizationRole();
  const isMobile = useIsMobile();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
  };

  function handleSuccess() {
    setOpen(false);
    onCreate();
  }

  if (!canEdit) return null;

  // Desktop keeps the centered dialog; mobile gets the bottom sheet.
  if (!isMobile) {
    return <CreateTransactionDialog onCreate={onCreate} trigger={trigger} defaultOpen={defaultOpen} open={controlledOpen} onOpenChange={onOpenChange} defaultType={defaultType} defaultAmount={defaultAmount} defaultDescription={defaultDescription} defaultCategory={defaultCategory} />;
  }

  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      <BottomSheetTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva Transacción
          </Button>
        )}
      </BottomSheetTrigger>
      <BottomSheetContent snapPoints={["85dvh"]} aria-labelledby="tx-sheet-title">
        <BottomSheetHeader>
          <BottomSheetTitle id="tx-sheet-title">Nueva Transacción</BottomSheetTitle>
        </BottomSheetHeader>
        <TransactionForm onSuccess={handleSuccess} onCancel={() => setOpen(false)} defaultType={defaultType} defaultAmount={defaultAmount} defaultDescription={defaultDescription} defaultCategory={defaultCategory} />
      </BottomSheetContent>
    </BottomSheet>
  );
}
