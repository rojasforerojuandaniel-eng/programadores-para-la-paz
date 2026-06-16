"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-media-query";
import { CreateInvoiceDialog } from "@/components/dashboard/create-invoice-dialog";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@/components/ui/bottom-sheet";
import { InvoiceForm } from "@/components/dashboard/invoice-form";

interface CreateInvoiceSheetProps {
  onCreate: () => void;
  trigger?: React.ReactNode;
}

export function CreateInvoiceSheet({ onCreate, trigger }: CreateInvoiceSheetProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  function handleSuccess() {
    setOpen(false);
    onCreate();
  }

  if (!isMobile) {
    return <CreateInvoiceDialog onCreate={onCreate} trigger={trigger} />;
  }

  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      <BottomSheetTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Factura
          </Button>
        )}
      </BottomSheetTrigger>
      <BottomSheetContent snapPoints={["90dvh"]} aria-labelledby="inv-sheet-title">
        <BottomSheetHeader>
          <BottomSheetTitle id="inv-sheet-title">Nueva Factura</BottomSheetTitle>
        </BottomSheetHeader>
        <InvoiceForm onSuccess={handleSuccess} onCancel={() => setOpen(false)} />
      </BottomSheetContent>
    </BottomSheet>
  );
}
