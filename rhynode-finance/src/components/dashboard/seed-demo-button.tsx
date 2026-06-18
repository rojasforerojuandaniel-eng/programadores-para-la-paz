"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

export function SeedDemoButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function seed() {
    setLoading(true);
    try {
      const res = await fetch("/api/personal/seed-demo", { method: "POST" });
      const data = (await res.json()) as { seeded: boolean; message: string };
      setMessage(data.message);
      if (data.seeded) {
        setTimeout(() => window.location.reload(), 900);
      }
    } catch {
      setMessage("No se pudieron cargar los datos demo. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={seed} disabled={loading} variant="outline">
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        Cargar datos de ejemplo
      </Button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}