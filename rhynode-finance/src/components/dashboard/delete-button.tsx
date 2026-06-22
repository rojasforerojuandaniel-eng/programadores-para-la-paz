"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useOrganizationRole } from "@/hooks/use-organization-role";

interface DeleteButtonProps {
  endpoint: string;
  confirmMessage: string;
  title?: string;
}

export function DeleteButton({
  endpoint,
  confirmMessage,
  title,
}: DeleteButtonProps) {
  const t = useTranslations("dashboard.common");
  const router = useRouter();
  const { canEdit } = useOrganizationRole();

  async function handleDelete() {
    if (!confirm(confirmMessage)) return;
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        toast.error(t("deleteError"));
      }
    } catch {
      toast.error(t("networkError"));
    }
  }

  if (!canEdit) return null;

  const resolvedTitle = title ?? t("delete");

  return (
    <button
      onClick={handleDelete}
      className="inline-flex h-11 w-11 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title={resolvedTitle}
      aria-label={resolvedTitle}
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
