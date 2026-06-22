"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
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
import type { RecurringItem } from "./recurring-utils";
import { EditRecurringDialog } from "./edit-recurring-dialog";

interface RecurringActionsProps {
  item: RecurringItem;
  onUpdate?: (updated: RecurringItem) => void;
  onDelete?: (id: string) => void;
}

export function RecurringActions({
  item,
  onUpdate,
  onDelete,
}: RecurringActionsProps) {
  const router = useRouter();
  const t = useTranslations("dashboard.recurring");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(t("actions.confirmDelete"))) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/personal/recurring/${item.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(t("actions.deleted"));
        onDelete?.(item.id);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t("actions.deleteError"));
      }
    } catch {
      toast.error(t("toasts.networkError"));
    } finally {
      setDeleting(false);
      setSheetOpen(false);
    }
  }

  function handleSaved(updated: RecurringItem) {
    onUpdate?.(updated);
    setEditOpen(false);
    setSheetOpen(false);
  }

  const mobileTrigger = (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t("actions.openActions")}
      className="md:hidden"
    >
      <MoreVertical className="size-4" />
    </Button>
  );

  const desktopTrigger = (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t("actions.openActions")}
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
            >
              <Pencil className="size-4" /> {t("actions.edit")}
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2 text-destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="size-4" />
              {deleting ? t("actions.deleting") : t("actions.delete")}
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
            disabled={deleting}
          >
            <Pencil className="size-4" /> {t("actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
            disabled={deleting}
          >
            <Trash2 className="size-4" />
            {deleting ? t("actions.deleting") : t("actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {editOpen && (
        <EditRecurringDialog
          item={item}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
