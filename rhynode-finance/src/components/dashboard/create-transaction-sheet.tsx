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

interface CreateTransactionSheetProps {
  onCreate: () => void;
  trigger?: React.ReactNode;
}

export function CreateTransactionSheet({
  onCreate,
  trigger,
}: CreateTransactionSheetProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  function handleSuccess() {
    setOpen(false);
    onCreate();
  }

  // Desktop keeps the centered dialog; mobile gets the bottom sheet.
  if (!isMobile) {
    return <CreateTransactionDialog onCreate={onCreate} trigger={trigger} />;
  }

  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      <BottomSheetTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
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
