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
import { EditBankAccountDialog } from "./edit-bank-account-dialog";
import { DeleteBankAccountDialog } from "./delete-bank-account-dialog";

export interface BankAccountRow {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  type: "CHECKING" | "SAVINGS" | "CREDIT" | "VIRTUAL";
  currency: "COP" | "MXN" | "BRL" | "USD";
  balance: number;
}

interface BankAccountActionsProps {
  account: BankAccountRow;
}

export function BankAccountActions({ account }: BankAccountActionsProps) {
  const t = useTranslations("dashboard.accounts");
  const isMobile = useIsMobile();
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openActions, setOpenActions] = useState(false);

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("actions.optionsAria", { name: account.name })}
      className="h-11 w-11 shrink-0"
    >
      <MoreVertical className="h-5 w-5" />
    </Button>
  );

  const menuItems = (
    <>
      <button
        type="button"
        onClick={() => { setOpenActions(false); setOpenEdit(true); }}
        className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium outline-hidden transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Pencil className="h-4 w-4 text-muted-foreground" />
        {t("actions.edit")}
      </button>
      <button
        type="button"
        onClick={() => { setOpenActions(false); setOpenDelete(true); }}
        className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-destructive outline-hidden transition-colors hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
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
              <BottomSheetTitle>{t("table.actions")}</BottomSheetTitle>
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
              className="h-11 cursor-pointer px-3"
            >
              <Pencil className="h-4 w-4" />
              {t("actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setOpenDelete(true)}
              className="h-11 cursor-pointer px-3 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {t("actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <EditBankAccountDialog
        account={account}
        open={openEdit}
        onOpenChange={setOpenEdit}
      />
      <DeleteBankAccountDialog
        account={account}
        open={openDelete}
        onOpenChange={setOpenDelete}
      />
    </>
  );
}
