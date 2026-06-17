"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@/components/ui/bottom-sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Copy,
  Check,
  QrCode,
  MoreVertical,
  Pencil,
  Trash2,
  Power,
  ExternalLink,
} from "lucide-react";
import { EditPaymentLinkDialog } from "./payment-link-edit-dialog";
import { DeleteConfirmDialog } from "./payment-link-delete-dialog";

export interface PaymentLink {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  status: "ACTIVE" | "INACTIVE";
  urlSlug: string;
  maxPayments: number | null;
  currentPayments: number;
  expiresAt: string | null;
}

export function getPublicUrl(link: PaymentLink): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/pay/${encodeURIComponent(link.urlSlug)}`;
}

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el link");
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={copied ? "Link copiado" : "Copiar link"}
      onClick={handleCopy}
      className="h-11 w-11 shrink-0"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}

export function QrDialog({ url, name }: { url: string; name: string }) {
  const [open, setOpen] = useState(false);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
    url
  )}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Ver QR"
          className="h-11 w-11 shrink-0"
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="heading-card truncate pr-6">
            QR: {name}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="overflow-hidden rounded-xl border">
            <Image
              src={qrSrc}
              alt={`Código QR para ${name}`}
              width={280}
              height={280}
              unoptimized
            />
          </div>
          <CopyLinkButton url={url} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActionsTrigger() {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Acciones"
      className="h-11 w-11 shrink-0"
    >
      <MoreVertical className="h-4 w-4" />
    </Button>
  );
}

interface PaymentLinkActionsProps {
  link: PaymentLink;
  onRefresh: () => void;
  canEdit: boolean;
  className?: string;
}

export function PaymentLinkActions({
  link,
  onRefresh,
  canEdit,
  className,
}: PaymentLinkActionsProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const publicUrl = getPublicUrl(link);

  async function toggleStatus() {
    const nextStatus = link.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const response = await fetch(`/api/payment-links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error("Toggle failed");
      toast.success(nextStatus === "ACTIVE" ? "Link activado" : "Link desactivado");
      onRefresh();
    } catch {
      toast.error("No se pudo cambiar el estado");
    }
  }

  async function handleDelete() {
    try {
      const response = await fetch(`/api/payment-links/${link.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed");
      toast.success("Link eliminado");
      onRefresh();
    } catch {
      toast.error("No se pudo eliminar el link");
    }
  }

  function openLink() {
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className={cn("flex items-center", className)}>
      <div className="md:hidden">
        <BottomSheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <BottomSheetTrigger asChild>
            <ActionsTrigger />
          </BottomSheetTrigger>
          <BottomSheetContent>
            <BottomSheetHeader>
              <BottomSheetTitle>Acciones</BottomSheetTitle>
            </BottomSheetHeader>
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                className="h-11 w-full justify-start gap-3 px-3"
                onClick={() => {
                  setMobileOpen(false);
                  openLink();
                }}
              >
                <ExternalLink className="h-4 w-4" />
                Abrir link
              </Button>
              {canEdit && (
                <>
                  <Button
                    variant="ghost"
                    className="h-11 w-full justify-start gap-3 px-3"
                    onClick={() => {
                      setMobileOpen(false);
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-11 w-full justify-start gap-3 px-3"
                    onClick={() => {
                      setMobileOpen(false);
                      void toggleStatus();
                    }}
                  >
                    <Power className="h-4 w-4" />
                    {link.status === "ACTIVE" ? "Desactivar" : "Activar"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-11 w-full justify-start gap-3 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      setMobileOpen(false);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </Button>
                </>
              )}
            </div>
          </BottomSheetContent>
        </BottomSheet>
      </div>

      <div className="hidden md:block">
        <DropdownMenu open={desktopOpen} onOpenChange={setDesktopOpen}>
          <DropdownMenuTrigger asChild>
            <ActionsTrigger />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={openLink}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir link
            </DropdownMenuItem>
            {canEdit && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void toggleStatus()}>
                  <Power className="mr-2 h-4 w-4" />
                  {link.status === "ACTIVE" ? "Desactivar" : "Activar"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setDeleteOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <EditPaymentLinkDialog
        link={link}
        open={editOpen}
        onOpenChange={setEditOpen}
        onRefresh={onRefresh}
      />
      <DeleteConfirmDialog
        link={link}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
      />
    </div>
  );
}
