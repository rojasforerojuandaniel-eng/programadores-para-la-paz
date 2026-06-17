import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, Receipt } from "lucide-react";
import { buildMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = buildMetadata({
  title: "Suscripción activada",
  description: "Tu suscripción a Rhynode Finance ha sido activada correctamente.",
  path: "/dashboard/settings/billing/success",
});

export default function BillingSuccessPage() {
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="space-y-1">
        <h1 className="heading-section">Facturación</h1>
        <p className="body-default">Estado de tu suscripción</p>
      </div>

      <Card className="surface-elevated-2 border-success/20">
        <CardContent className="flex flex-col items-center p-6 text-center sm:p-10">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
            <CheckCircle className="h-8 w-8 text-success" aria-hidden="true" />
          </div>
          <h2 className="heading-card text-foreground">
            ¡Suscripción activada!
          </h2>
          <p className="body-default mt-2 max-w-sm">
            Tu pago se procesó correctamente. Ya puedes disfrutar de los beneficios de tu nuevo plan.
          </p>

          <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" className="w-full gap-2">
              <Link href="/dashboard/settings">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver a configuración
              </Link>
            </Button>
            <Button asChild className="w-full gap-2">
              <Link href="/dashboard/invoices">
                <Receipt className="h-4 w-4" aria-hidden="true" />
                Ir a facturas
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
