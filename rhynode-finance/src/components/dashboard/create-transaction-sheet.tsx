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
}

export function CreateTransactionSheet({
  onCreate,
  trigger,
  defaultOpen = false,
}: CreateTransactionSheetProps) {
  const { canEdit } = useOrganizationRole();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(defaultOpen);

  function handleSuccess() {
    setOpen(false);
    onCreate();
  }

  if (!canEdit) return null;

  // Desktop keeps the centered dialog; mobile gets the bottom sheet.
  if (!isMobile) {
    return <CreateTransactionDialog onCreate={onCreate} trigger={trigger} defaultOpen={defaultOpen} />;
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
        <TransactionForm onSuccess={handleSuccess} onCancel={() => setOpen(false)} />
      </BottomSheetContent>
    </BottomSheet>
  );
}
