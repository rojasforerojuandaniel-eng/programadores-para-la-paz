import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Lock } from "lucide-react";
import Link from "next/link";

export interface PlanLimitUpgradeCardProps {
  planName: string;
  resource: "invoices" | "users";
  limit: number;
  current: number;
}

const resourceLabels: Record<"invoices" | "users", { singular: string; plural: string }> = {
  invoices: { singular: "factura", plural: "facturas" },
  users: { singular: "usuario", plural: "usuarios" },
};

export function PlanLimitUpgradeCard({
  planName,
  resource,
  limit,
  current,
}: PlanLimitUpgradeCardProps) {
  const labels = resourceLabels[resource];
  const isOverLimit = limit !== Infinity && current >= limit;
  const progress = limit === Infinity ? 0 : Math.min(100, (current / limit) * 100);

  return (
    <Card
      role="region"
      aria-live="polite"
      aria-label={`Límite de ${labels.plural} alcanzado en plan ${planName}`}
      className="surface-elevated-2 border-warning/20"
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle className="heading-card text-base">
              Límite de {labels.plural} alcanzado
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary">
            {planName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <p className="body-default text-sm">
          Has usado <strong>{current}</strong> de <strong>{limit === Infinity ? "∞" : limit}</strong>{" "}
          {current === 1 ? labels.singular : labels.plural} en tu plan actual. Sube de plan para
          continuar creando {labels.plural} sin restricciones.
        </p>

        {limit !== Infinity && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Consumo</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              aria-hidden="true"
            >
              <div
                className={`h-full rounded-full transition-all ${
                  isOverLimit ? "bg-danger" : "bg-warning"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <Button asChild className="gap-2">
          <Link href="/dashboard/settings?tab=billing">
            Ver planes
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
