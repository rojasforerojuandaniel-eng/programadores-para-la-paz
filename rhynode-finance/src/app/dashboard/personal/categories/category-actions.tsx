"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@/components/ui/bottom-sheet";
import { useIsMobile } from "@/hooks/use-media-query";
import { EditCategoryDialog } from "./edit-dialog";
import { DeleteCategoryDialog } from "./delete-dialog";
import type { CategoryRow } from "./types";

interface CategoryActionsProps {
  category: CategoryRow;
  categories: CategoryRow[];
}

export function CategoryActions({ category, categories }: CategoryActionsProps) {
  const t = useTranslations("dashboard.categories");
  const isMobile = useIsMobile();
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openActions, setOpenActions] = useState(false);

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("actions.optionsLabel", { name: category.name })}
      className="h-9 w-9 shrink-0"
    >
      <MoreVertical className="h-4 w-4" />
    </Button>
  );

  const menuItems = (
    <>
      <button
        type="button"
        onClick={() => { setOpenActions(false); setOpenEdit(true); }}
        className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        {t("actions.edit")}
      </button>
      <button
        type="button"
        onClick={() => { setOpenActions(false); setOpenDelete(true); }}
        className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-destructive outline-hidden transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {t("actions.delete")}
      </button>
    </>
  );

  return (
    <>
      {isMobile ? (
        <BottomSheet open={openActions} onOpenChange={setOpenActions}>
          <BottomSheetTrigger asChild>{trigger}</BottomSheetTrigger>
          <BottomSheetContent className="px-4 pb-6" showCloseButton>
            <BottomSheetHeader className="pb-2">
              <BottomSheetTitle>{t("actions.title")}</BottomSheetTitle>
            </BottomSheetHeader>
            <div className="flex flex-col gap-1">{menuItems}</div>
          </BottomSheetContent>
        </BottomSheet>
      ) : (
        <DropdownMenu open={openActions} onOpenChange={setOpenActions}>
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => setOpenEdit(true)}
              className="h-10 cursor-pointer px-3"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {t("actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setOpenDelete(true)}
              className="h-10 cursor-pointer px-3"
              variant="destructive"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t("actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {openEdit && (
        <EditCategoryDialog
          category={category}
          categories={categories}
          open={openEdit}
          onOpenChange={setOpenEdit}
        />
      )}
      {openDelete && (
        <DeleteCategoryDialog
          category={category}
          open={openDelete}
          onOpenChange={setOpenDelete}
        />
      )}
    </>
  );
}