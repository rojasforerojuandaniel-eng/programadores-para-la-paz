"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function UpdateSnapshotButton({
  totalAssets,
  totalLiabilities,
  currency,
}: {
  totalAssets: number;
  totalLiabilities: number;
  currency: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/personal/net-worth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalAssets, totalLiabilities, currency }),
      });
      if (!res.ok) throw new Error("No se pudo guardar el snapshot");
      window.location.reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="default" className="gap-2" onClick={handleClick} disabled={loading}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      {loading ? "Guardando..." : "Actualizar Snapshot"}
    </Button>
  );
}
