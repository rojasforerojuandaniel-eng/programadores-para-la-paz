"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
// import { toast } from "sonner";

interface PaymentLinkData {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  urlSlug: string;
  organizationName: string;
  organizationCountry: string;
  maxPayments: number | null;
  currentPayments: number;
}

// const currencySymbols: Record<string, string> = {
//   COP: "$",
//   MXN: "$",
//   BRL: "R$",
//   USD: "$",
//   ARS: "$",
//   CLP: "$",
//   PEN: "S/",
// };

function formatAmount(amount: number, currency: string) {
  // const symbol = currencySymbols[currency] || currency;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [link, setLink] = useState<PaymentLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingStripe, setPayingStripe] = useState(false);
  const [payingWompi, setPayingWompi] = useState(false);

  const success = searchParams.get("success") === "true";
  const wompiSuccess = searchParams.get("wompi") === "success";
  const canceled = searchParams.get("canceled") === "true";

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/payment-links/public/${slug}`)
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error || "Error al cargar");
        }
        return r.json();
      })
      .then((data) => {
        setLink(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  async function handleStripePayment() {
    if (!link) return;
    setPayingStripe(true);
    try {
      const res = await fetch(`/api/payment-links/${link.id}/checkout/stripe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Error al iniciar pago con Stripe");
      }
    } catch {
      setError("Error de red");
    } finally {
      setPayingStripe(false);
    }
  }

  async function handleWompiPayment() {
    if (!link) return;
    setPayingWompi(true);
    try {
      const res = await fetch(`/api/payment-links/${link.id}/checkout/wompi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        setError(data.error);
      } else {
        setError("Error al iniciar pago con Wompi");
      }
    } catch {
      setError("Error de red");
    } finally {
      setPayingWompi(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Cargando link de pago" />
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-400" aria-hidden="true" />
        <h1 className="text-xl font-semibold">{error || "Link no disponible"}</h1>
        <p className="text-muted-foreground">
          Este link de cobro no existe, ha expirado o alcanzó su límite.
        </p>
      </div>
    );
  }

  if (success || wompiSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <CheckCircle className="h-16 w-16 text-emerald-400" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">¡Pago exitoso!</h1>
        <p className="text-muted-foreground max-w-sm">
          Tu pago a <strong>{link.organizationName}</strong> por{" "}
          {formatAmount(link.amount, link.currency)} ha sido procesado.
        </p>
        <p className="text-sm text-muted-foreground">
          Recibirás un comprobante por email en los próximos minutos.
        </p>
      </div>
    );
  }

  if (canceled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <XCircle className="h-16 w-16 text-amber-400" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">Pago cancelado</h1>
        <p className="text-muted-foreground max-w-sm">
          No se realizó ningún cargo. Puedes intentar de nuevo cuando quieras.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Intentar de nuevo
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="text-lg font-semibold text-primary">Rhynode</span>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Finance
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Pagos seguros para {link.organizationName}
          </p>
        </div>

        <Card className="surface-elevated-2">
          <CardHeader>
            <CardTitle className="heading-card">{link.name}</CardTitle>
            {link.description && (
              <p className="body-default mt-1">{link.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total a pagar</div>
              <div className="mt-1 text-4xl font-bold">
                {formatAmount(link.amount, link.currency)}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <Badge variant="outline">{link.currency}</Badge>
                {link.maxPayments && (
                  <Badge variant="outline">
                    {link.currentPayments} / {link.maxPayments} pagos
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Pago seguro encriptado
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Comprobante por email
              </div>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleStripePayment}
                disabled={payingStripe || payingWompi}
              >
                {payingStripe ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                )}
                {payingStripe
                  ? "Redirigiendo a Stripe..."
                  : `Pagar con tarjeta ${formatAmount(link.amount, link.currency)}`}
              </Button>

              <Button
                className="w-full gap-2"
                size="lg"
                variant="outline"
                onClick={handleWompiPayment}
                disabled={payingStripe || payingWompi}
              >
                {payingWompi ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                )}
                {payingWompi
                  ? "Redirigiendo a Wompi..."
                  : "Pagar con Wompi (Colombia)"}
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Al pagar, aceptas los términos y condiciones de{" "}
              {link.organizationName}.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
