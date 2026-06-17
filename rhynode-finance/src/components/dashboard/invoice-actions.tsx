"use client";

import { useState } from "react";
import {
  Ban,
  CheckCircle,
  Copy,
  Eye,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-media-query";
import { useOrganizationRole } from "@/hooks/use-organization-role";
import { InvoicePreview } from "@/components/dashboard/invoice-preview";
import { CreateInvoiceSheet } from "@/components/dashboard/create-invoice-sheet";
import { EditInvoiceDialog } from "./edit-invoice-dialog";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount?: number;
  total?: number;
}

interface InvoiceWithItems {
  id: string;
  number: string;
  status: string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  issueDate: string;
  dueDate?: string | null;
  notes?: string | null;
  terms?: string | null;
  clientId?: string;
  client?: {
    id?: string;
    name?: string;
    email?: string | null;
    address?: string | null;
  };
  project?: { name?: string };
  items?: InvoiceItem[];
}

interface InvoiceActionsProps {
  invoice: InvoiceWithItems;
  onRefresh: () => void;
}

interface MobileActionItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  loading?: boolean;
}

function MobileActionItem({
  icon: Icon,
  label,
  onClick,
  destructive,
  loading,
}: MobileActionItemProps) {
  return (
    <Button
      variant="ghost"
      className="h-11 w-full justify-start gap-3 px-3"
      onClick={onClick}
      disabled={loading}
    >
      <Icon
        className={
          destructive
            ? "h-4 w-4 text-destructive"
            : "h-4 w-4 text-muted-foreground"
        }
      />
      <span className={destructive ? "text-destructive" : undefined}>
        {loading ? `${label}...` : label}
      </span>
    </Button>
  );
}

export function InvoiceActions({ invoice, onRefresh }: InvoiceActionsProps) {
  const isMobile = useIsMobile();
  const { canEdit } = useOrganizationRole();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingPay, setLoadingPay] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

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

  async function handleSend() {
    setLoadingSend(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Send failed");
      const data = (await res.json()) as { sentAt?: string };
      toast.success(
        `Factura enviada${data.sentAt ? ` el ${new Date(data.sentAt).toLocaleDateString("es-CO")}` : ""}`
      );
      onRefresh();
    } catch {
      toast.error("Error al enviar factura");
    } finally {
      setLoadingSend(false);
      setActionsOpen(false);
    }
  }

  async function handleMarkPaid() {
    setLoadingPay(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/mark-paid`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Mark paid failed");
      const data = (await res.json()) as { transaction?: { id: string } };
      toast.success(
        data.transaction?.id
          ? "Factura marcada como pagada e ingreso creado"
          : "Factura marcada como pagada"
      );
      onRefresh();
    } catch {
      toast.error("Error al marcar factura como pagada");
    } finally {
      setLoadingPay(false);
      setActionsOpen(false);
    }
  }

  async function handleDelete() {
    setLoadingDelete(true);
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
      setLoadingDelete(false);
      setDeleteOpen(false);
      setActionsOpen(false);
    }
  }

  const canSend = invoice.status !== "PAID" && invoice.status !== "CANCELLED";
  const canPay = ["SENT", "OVERDUE", "PARTIAL"].includes(invoice.status);
  const canCancel = invoice.status === "DRAFT" || invoice.status === "SENT";

  const duplicateDefaults = {
    clientId: invoice.client?.id || invoice.clientId || "",
    number: "",
    currency: invoice.currency,
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: invoice.dueDate
      ? new Date(invoice.dueDate).toISOString().split("T")[0]
      : "",
    notes: invoice.notes || "",
    terms: invoice.terms || "",
    items: (invoice.items || []).map((item) => ({
      description: item.description,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      taxRate: Number(item.taxRate) || 19,
    })),
  };

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
      <MobileActionItem
        icon={Eye}
        label="Ver"
        onClick={() => {
          setActionsOpen(false);
          setViewOpen(true);
        }}
      />
      <MobileActionItem
        icon={Copy}
        label="Duplicar"
        onClick={() => {
          setActionsOpen(false);
          setDuplicateOpen(true);
        }}
      />
      {canSend && (
        <MobileActionItem
          icon={Send}
          label="Enviar"
          onClick={() => {
            setActionsOpen(false);
            void handleSend();
          }}
          loading={loadingSend}
        />
      )}
      {canPay && (
        <MobileActionItem
          icon={CheckCircle}
          label="Marcar pagada"
          onClick={() => {
            setActionsOpen(false);
            void handleMarkPaid();
          }}
          loading={loadingPay}
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
        loading={loadingDelete}
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
            <DropdownMenuItem
              onSelect={() => {
                setActionsOpen(false);
                setViewOpen(true);
              }}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Ver
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setActionsOpen(false);
                setDuplicateOpen(true);
              }}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {canSend && (
              <DropdownMenuItem
                onSelect={() => void handleSend()}
                disabled={loadingSend}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {loadingSend ? "Enviando..." : "Enviar"}
              </DropdownMenuItem>
            )}
            {canPay && (
              <DropdownMenuItem
                onSelect={() => void handleMarkPaid()}
                disabled={loadingPay}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {loadingPay ? "Marcando..." : "Marcar pagada"}
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
              disabled={loadingDelete}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {loadingDelete ? "Eliminando..." : "Eliminar"}
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

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="heading-card">Vista de factura</DialogTitle>
            <DialogDescription className="body-default">
              Previsualización de {invoice.number}
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <InvoicePreview invoice={invoice} />
          </div>
        </DialogContent>
      </Dialog>

      <CreateInvoiceSheet
        onCreate={onRefresh}
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        trigger={null}
        defaultValues={duplicateDefaults}
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
              disabled={loadingDelete}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={loadingDelete}
            >
              {loadingDelete ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
