"use client";

import { useRouter } from "next/navigation";
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
  title = "Eliminar",
}: DeleteButtonProps) {
  const router = useRouter();
  const { canEdit } = useOrganizationRole();

  async function handleDelete() {
    if (!confirm(confirmMessage)) return;
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        toast.error("Error al eliminar");
      }
    } catch {
      toast.error("Error de red");
    }
  }

  if (!canEdit) return null;

  return (
    <button
      onClick={handleDelete}
      className="inline-flex h-11 w-11 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      title={title}
      aria-label={title}
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
