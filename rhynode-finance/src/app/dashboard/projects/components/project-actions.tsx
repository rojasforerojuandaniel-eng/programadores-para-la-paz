"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MoreVertical, Pencil, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@/components/ui/bottom-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useOrganizationRole } from "@/hooks/use-organization-role";

interface ProjectActionsProps {
  projectName: string;
}

export function ProjectActions({ projectName }: ProjectActionsProps) {
  const t = useTranslations("dashboard.projects");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const { canEdit } = useOrganizationRole();

  if (!canEdit) return null;

  const handleEdit = () => {
    toast.info(t("actions.comingSoon"), {
      description: t("actions.editAction", { name: projectName }),
    });
    setMobileOpen(false);
    setDesktopOpen(false);
  };

  const handleArchive = () => {
    toast.info(t("actions.comingSoon"), {
      description: t("actions.archiveAction", { name: projectName }),
    });
    setMobileOpen(false);
    setDesktopOpen(false);
  };

  const handleDelete = () => {
    toast.info(t("actions.comingSoon"), {
      description: t("actions.deleteAction", { name: projectName }),
    });
    setMobileOpen(false);
    setDesktopOpen(false);
  };

  return (
    <>
      <BottomSheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <BottomSheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 lg:hidden"
            aria-label={t("actions.actionsFor", { name: projectName })}
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </BottomSheetTrigger>
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>{t("actions.title")}</BottomSheetTitle>
            <p className="text-sm text-muted-foreground">{projectName}</p>
          </BottomSheetHeader>
          <div className="flex flex-col gap-2 py-2">
            <Button
              variant="ghost"
              className="min-h-11 justify-start gap-3 px-3"
              onClick={handleEdit}
            >
              <Pencil className="h-4 w-4" />
              {t("actions.edit")}
            </Button>
            <Button
              variant="ghost"
              className="min-h-11 justify-start gap-3 px-3"
              onClick={handleArchive}
            >
              <Archive className="h-4 w-4" />
              {t("actions.archive")}
            </Button>
            <Button
              variant="ghost"
              className="min-h-11 justify-start gap-3 px-3 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              {t("actions.delete")}
            </Button>
          </div>
        </BottomSheetContent>
      </BottomSheet>

      <DropdownMenu open={desktopOpen} onOpenChange={setDesktopOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-11 w-11 shrink-0 lg:inline-flex"
            aria-label={t("actions.actionsFor", { name: projectName })}
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEdit} className="min-h-10 gap-2">
            <Pencil className="h-4 w-4" />
            {t("actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleArchive} className="min-h-10 gap-2">
            <Archive className="h-4 w-4" />
            {t("actions.archive")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDelete}
            className="min-h-10 gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {t("actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
