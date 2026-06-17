"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-media-query";
import {
  CreateInvoiceDialog,
  type CreateInvoiceDialogProps,
} from "@/components/dashboard/create-invoice-dialog";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@/components/ui/bottom-sheet";
import { InvoiceForm } from "@/components/dashboard/invoice-form";
import { useOrganizationRole } from "@/hooks/use-organization-role";

type CreateInvoiceSheetProps = Pick<
  CreateInvoiceDialogProps,
  | "onCreate"
  | "trigger"
  | "defaultOpen"
  | "open"
  | "onOpenChange"
  | "defaultValues"
>;

export function CreateInvoiceSheet({
  onCreate,
  trigger,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  defaultValues,
}: CreateInvoiceSheetProps) {
  const { canEdit } = useOrganizationRole();
  const isMobile = useIsMobile();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  function handleSuccess() {
    setOpen(false);
    onCreate();
  }

  if (!canEdit) return null;

  if (!isMobile) {
    return (
      <CreateInvoiceDialog
        onCreate={onCreate}
        trigger={trigger}
        defaultOpen={defaultOpen}
        open={open}
        onOpenChange={setOpen}
        defaultValues={defaultValues}
      />
    );
  }

  return (
    <BottomSheet open={open} onOpenChange={setOpen}>
      {trigger !== undefined ? (
        trigger !== null && (
          <BottomSheetTrigger asChild>{trigger}</BottomSheetTrigger>
        )
      ) : (
        <BottomSheetTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Factura
          </Button>
        </BottomSheetTrigger>
      )}
      <BottomSheetContent
        snapPoints={["90dvh"]}
        aria-labelledby="inv-sheet-title"
      >
        <BottomSheetHeader>
          <BottomSheetTitle id="inv-sheet-title">Nueva Factura</BottomSheetTitle>
        </BottomSheetHeader>
        <InvoiceForm
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
          defaultValues={defaultValues}
        />
      </BottomSheetContent>
    </BottomSheet>
  );
}
