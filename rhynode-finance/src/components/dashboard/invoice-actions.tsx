"use client";

import { useState } from "react";
import {
  Ban,
  CheckCircle,
  MoreVertical,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@/components/ui/bottom-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-media-query";
import { useOrganizationRole } from "@/hooks/use-organization-role";
import { EditInvoiceDialog, type Invoice } from "./edit-invoice-dialog";

interface InvoiceActionsProps {
  invoice: Invoice;
  onRefresh: () => void;
}

interface MobileActionItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

function MobileActionItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: MobileActionItemProps) {
  return (
    <Button
      variant="ghost"
      className="h-11 w-full justify-start gap-3 px-3"
      onClick={onClick}
    >
      <Icon
        className={
          destructive
            ? "h-4 w-4 text-destructive"
            : "h-4 w-4 text-muted-foreground"
        }
      />
      <span className={destructive ? "text-destructive" : undefined}>{label}</span>
    </Button>
  );
}

export function InvoiceActions({ invoice, onRefresh }: InvoiceActionsProps) {
  const isMobile = useIsMobile();
  const { canEdit } = useOrganizationRole();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!canEdit) return null;

  async function updateStatus(status: string) {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Estado actualizado");
      onRefresh();
    } catch {
      toast.error("Error al actualizar estado");
    } finally {
      setActionsOpen(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Factura eliminada");
      onRefresh();
    } catch {
      toast.error("Error al eliminar factura");
    } finally {
      setLoading(false);
      setDeleteOpen(false);
      setActionsOpen(false);
    }
  }

  const canSend = invoice.status === "DRAFT";
  const canPay = ["SENT", "OVERDUE", "PARTIAL"].includes(invoice.status);
  const canCancel = invoice.status === "DRAFT" || invoice.status === "SENT";

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Acciones de factura ${invoice.number}`}
      className="h-10 w-10 shrink-0"
    >
      <MoreVertical className="h-4 w-4" />
    </Button>
  );

  const mobileActions = (
    <div className="flex flex-col gap-1 py-2">
      {canSend && (
        <MobileActionItem
          icon={Send}
          label="Enviar"
          onClick={() => {
            setActionsOpen(false);
            void updateStatus("SENT");
          }}
        />
      )}
      {canPay && (
        <MobileActionItem
          icon={CheckCircle}
          label="Marcar pagada"
          onClick={() => {
            setActionsOpen(false);
            void updateStatus("PAID");
          }}
        />
      )}
      {canCancel && (
        <MobileActionItem
          icon={Ban}
          label="Anular"
          onClick={() => {
            setActionsOpen(false);
            void updateStatus("CANCELLED");
          }}
        />
      )}
      <MobileActionItem
        icon={Pencil}
        label="Editar"
        onClick={() => {
          setActionsOpen(false);
          setEditOpen(true);
        }}
      />
      <MobileActionItem
        icon={Trash2}
        label="Eliminar"
        destructive
        onClick={() => {
          setActionsOpen(false);
          setDeleteOpen(true);
        }}
      />
    </div>
  );

  return (
    <>
      {isMobile ? (
        <BottomSheet open={actionsOpen} onOpenChange={setActionsOpen}>
          <BottomSheetTrigger asChild>{trigger}</BottomSheetTrigger>
          <BottomSheetContent>
            <BottomSheetHeader>
              <BottomSheetTitle>Acciones</BottomSheetTitle>
              <BottomSheetDescription>
                Factura {invoice.number}
              </BottomSheetDescription>
            </BottomSheetHeader>
            {mobileActions}
          </BottomSheetContent>
        </BottomSheet>
      ) : (
        <DropdownMenu open={actionsOpen} onOpenChange={setActionsOpen}>
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {canSend && (
              <DropdownMenuItem
                onSelect={() => void updateStatus("SENT")}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Enviar
              </DropdownMenuItem>
            )}
            {canPay && (
              <DropdownMenuItem
                onSelect={() => void updateStatus("PAID")}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Marcar pagada
              </DropdownMenuItem>
            )}
            {canCancel && (
              <DropdownMenuItem
                onSelect={() => void updateStatus("CANCELLED")}
                className="gap-2"
              >
                <Ban className="h-4 w-4" />
                Anular
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => {
                setActionsOpen(false);
                setEditOpen(true);
              }}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                setActionsOpen(false);
                setDeleteOpen(true);
              }}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <EditInvoiceDialog
        invoice={invoice}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={onRefresh}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="heading-card">Eliminar factura</DialogTitle>
            <DialogDescription className="body-default">
              Estás a punto de eliminar la factura{" "}
              <strong>{invoice.number}</strong>. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={loading}
            >
              {loading ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
