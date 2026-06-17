"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Ban,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { SubscriptionItem } from "./subscription-utils";
import {
  deleteSubscription,
  markSubscriptionForCancel,
} from "./actions";
import { EditSubscriptionDialog } from "./edit-subscription-dialog";

interface SubscriptionActionsProps {
  item: SubscriptionItem;
  onUpdate?: (updated: SubscriptionItem) => void;
  onDelete?: (id: string) => void;
}

export function SubscriptionActions({
  item,
  onUpdate,
  onDelete,
}: SubscriptionActionsProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isMarkedForCancel = item.status === "PENDING_CANCELLATION";

  async function handleDelete() {
    if (!window.confirm(`¿Eliminar la suscripción "${item.name}"?`)) return;
    setLoading(true);
    try {
      const result = await deleteSubscription(item.id);
      if (result.success) {
        toast.success("Suscripción eliminada");
        onDelete?.(item.id);
        router.refresh();
      } else {
        toast.error(result.error || "No se pudo eliminar");
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
      setSheetOpen(false);
    }
  }

  async function handleToggleCancel() {
    setLoading(true);
    try {
      const result = await markSubscriptionForCancel(item.id, !isMarkedForCancel);
      if (result.success) {
        toast.success(
          isMarkedForCancel
            ? "Suscripción activada nuevamente"
            : "Marcada para cancelar"
        );
        onUpdate?.({ ...item, status: isMarkedForCancel ? "ACTIVE" : "PENDING_CANCELLATION" });
        router.refresh();
      } else {
        toast.error(result.error || "No se pudo cambiar el estado");
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
      setSheetOpen(false);
    }
  }

  function handleSaved(updated: SubscriptionItem) {
    onUpdate?.(updated);
    setEditOpen(false);
    setSheetOpen(false);
  }

  const mobileTrigger = (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Abrir acciones"
      className="md:hidden"
    >
      <MoreVertical className="size-4" />
    </Button>
  );

  const desktopTrigger = (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Abrir acciones"
      className="hidden md:flex"
    >
      <MoreVertical className="size-4" />
    </Button>
  );

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>{mobileTrigger}</SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-xl pb-safe">
          <SheetHeader>
            <SheetTitle className="truncate pr-8">{item.name}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2 py-4">
            <Button
              variant="ghost"
              className="justify-start gap-2"
              onClick={() => setEditOpen(true)}
              disabled={loading}
            >
              <Pencil className="size-4" /> Editar
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2 text-amber-600"
              onClick={handleToggleCancel}
              disabled={loading}
            >
              {isMarkedForCancel ? (
                <>
                  <RotateCcw className="size-4" />
                  Reactivar
                </>
              ) : (
                <>
                  <Ban className="size-4" />
                  Marcar para cancelar
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2 text-destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="size-4" />
              {loading ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>{desktopTrigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setEditOpen(true);
            }}
            disabled={loading}
          >
            <Pencil className="size-4" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              void handleToggleCancel();
            }}
            disabled={loading}
          >
            {isMarkedForCancel ? (
              <>
                <RotateCcw className="size-4" /> Reactivar
              </>
            ) : (
              <>
                <Ban className="size-4" /> Marcar para cancelar
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
            disabled={loading}
          >
            <Trash2 className="size-4" />
            {loading ? "Eliminando..." : "Eliminar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {editOpen && (
        <EditSubscriptionDialog
          item={item}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
