"use client";

import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function TrendBadge({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up") {
    return (
      <Badge variant="outline" className="gap-1 text-emerald-600">
        <TrendingUp className="h-3 w-3" />
        Subió
      </Badge>
    );
  }
  if (trend === "down") {
    return (
      <Badge variant="outline" className="gap-1 text-rose-600">
        <TrendingDown className="h-3 w-3" />
        Bajó
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Minus className="h-3 w-3" />
      Estable
    </Badge>
  );
}
