"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("dashboard.netWorth.updateButton");
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/personal/net-worth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalAssets, totalLiabilities, currency }),
      });
      if (!res.ok) throw new Error(t("errorSave"));
      window.location.reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("errorUnknown");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="default" className="gap-2" onClick={handleClick} disabled={loading}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      {loading ? t("saving") : t("label")}
    </Button>
  );
}