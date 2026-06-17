import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, HelpCircle } from "lucide-react";
import { buildMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = buildMetadata({
  title: "Suscripción cancelada",
  description: "El proceso de pago fue cancelado. No se realizó ningún cargo.",
  path: "/dashboard/settings/billing/cancel",
});

export default function BillingCancelPage() {
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="space-y-1">
        <h1 className="heading-section">Facturación</h1>
        <p className="body-default">Estado de tu suscripción</p>
      </div>

      <Card className="surface-elevated-2 border-info/20">
        <CardContent className="flex flex-col items-center p-6 text-center sm:p-10">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-info/15">
            <XCircle className="h-8 w-8 text-info" aria-hidden="true" />
          </div>
          <h2 className="heading-card text-foreground">
            Pago cancelado
          </h2>
          <p className="body-default mt-2 max-w-sm">
            No se realizó ningún cargo. Puedes intentar de nuevo cuando quieras o elegir otro plan.
          </p>

          <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" className="w-full gap-2">
              <Link href="/dashboard/settings">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver a configuración
              </Link>
            </Button>
            <Button asChild variant="secondary" className="w-full gap-2">
              <Link href="mailto:soporte@rhynode.com">
                <HelpCircle className="h-4 w-4" aria-hidden="true" />
                Ayuda
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
