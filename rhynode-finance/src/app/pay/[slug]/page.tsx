"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Info,
} from "lucide-react";

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

type PaymentStatus =
  | "loading"
  | "active"
  | "success"
  | "canceled"
  | "not-found"
  | "expired"
  | "limit-reached"
  | "error";

type TerminalStatus = Exclude<PaymentStatus, "loading" | "active">;

class PaymentLinkError extends Error {
  constructor(
    public readonly status: TerminalStatus,
    message: string
  ) {
    super(message);
    this.name = "PaymentLinkError";
  }
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function resolveErrorStatus(
  status: number,
  message?: string
): TerminalStatus {
  if (status === 404) return "not-found";
  if (status === 410) {
    if (message?.toLowerCase().includes("expirado")) return "expired";
    return "limit-reached";
  }
  return "error";
}

function FadeIn({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "animate-in fade-in zoom-in-95 slide-in-from-bottom-2 fill-mode-forwards duration-300 motion-reduce:animate-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

const toneConfig = {
  success: {
    icon: CheckCircle,
    iconColor: "text-foreground",
    ring: "bg-success/15",
    border: "border-success/20",
  },
  danger: {
    icon: XCircle,
    iconColor: "text-foreground",
    ring: "bg-danger/15",
    border: "border-danger/20",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-foreground",
    ring: "bg-warning/20",
    border: "border-warning/25",
  },
  info: {
    icon: Info,
    iconColor: "text-foreground",
    ring: "bg-info/15",
    border: "border-info/20",
  },
};

type Tone = keyof typeof toneConfig;

function StatusCard({
  tone,
  title,
  message,
  children,
  className,
}: {
  tone: Tone;
  title: string;
  message: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const config = toneConfig[tone];
  const Icon = config.icon;

  return (
    <FadeIn
      className={cn(
        "surface-elevated-2 mx-auto w-full max-w-md rounded-xl border p-6 text-center",
        config.border,
        className
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={cn(
          "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border",
          config.ring,
          config.border
        )}
      >
        <Icon className={cn("h-8 w-8", config.iconColor)} aria-hidden="true" />
      </div>
      <h1 className="heading-card text-foreground">{title}</h1>
      <p className="body-default mt-2">{message}</p>
      {children && <div className="mt-6 flex flex-col gap-3">{children}</div>}
    </FadeIn>
  );
}

function LoadingState() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background px-4 pb-safe"
      role="status"
      aria-live="polite"
      aria-label="Cargando link de pago"
    >
      <FadeIn>
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-hidden="true"
        />
      </FadeIn>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pb-safe">
      <StatusCard
        tone="danger"
        title="Link no encontrado"
        message="Este link de cobro no existe o está inactivo. Verifica la URL o solicita uno nuevo."
      >
        <Button asChild variant="outline" className="w-full gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al inicio
          </Link>
        </Button>
      </StatusCard>
    </div>
  );
}

function ExpiredState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pb-safe">
      <StatusCard
        tone="warning"
        title="Link expirado"
        message="Este link de cobro ya no está disponible porque su fecha límite ha pasado."
      >
        <Button asChild variant="outline" className="w-full gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al inicio
          </Link>
        </Button>
      </StatusCard>
    </div>
  );
}

function LimitReachedState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pb-safe">
      <StatusCard
        tone="warning"
        title="Límite alcanzado"
        message="Este link de cobro ha alcanzado el número máximo de pagos permitidos."
      >
        <Button asChild variant="outline" className="w-full gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al inicio
          </Link>
        </Button>
      </StatusCard>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pb-safe">
      <StatusCard
        tone="danger"
        title="No pudimos cargar el link"
        message={message}
      >
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="w-full gap-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Intentar de nuevo
        </Button>
      </StatusCard>
    </div>
  );
}

function SuccessState({ link }: { link: PaymentLinkData | null }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pb-safe">
      <StatusCard
        tone="success"
        title="¡Pago exitoso!"
        message={
          link
            ? `Tu pago a ${link.organizationName} por ${formatAmount(
                link.amount,
                link.currency
              )} ha sido procesado.`
            : "Tu pago ha sido procesado correctamente."
        }
      >
        <p className="text-sm text-muted-foreground">
          Recibirás un comprobante por email en los próximos minutos.
        </p>
        <Button asChild variant="outline" className="w-full gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al inicio
          </Link>
        </Button>
      </StatusCard>
    </div>
  );
}

function CanceledState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pb-safe">
      <StatusCard
        tone="info"
        title="Pago cancelado"
        message="No se realizó ningún cargo. Puedes intentar de nuevo cuando quieras."
      >
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="w-full gap-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Intentar de nuevo
        </Button>
      </StatusCard>
    </div>
  );
}

function PaymentForm({
  link,
  payingStripe,
  payingWompi,
  onStripe,
  onWompi,
}: {
  link: PaymentLinkData;
  payingStripe: boolean;
  payingWompi: boolean;
  onStripe: () => void;
  onWompi: () => void;
}) {
  const disabled = payingStripe || payingWompi;

  return (
    <div className="min-h-screen bg-background px-4 py-8 pb-safe sm:py-12">
      <FadeIn className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="text-lg font-semibold text-primary">Rhynode</span>
            <Badge variant="secondary">Finance</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Pagos seguros para {link.organizationName}
          </p>
        </div>

        <Card className="surface-elevated-2">
          <CardHeader>
            <CardTitle className="heading-card" asChild>
              <h1>{link.name}</h1>
            </CardTitle>
            {link.description && (
              <p className="body-default mt-1">{link.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total a pagar</div>
              <div className="mt-1 text-4xl font-bold text-foreground">
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

            <div className="space-y-3 rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-3 text-sm text-foreground">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/15">
                  <ShieldCheck
                    className="h-4 w-4 text-success"
                    aria-hidden="true"
                  />
                </div>
                Pago seguro encriptado
              </div>
              <div className="flex items-center gap-3 text-sm text-foreground">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-info/15">
                  <CreditCard
                    className="h-4 w-4 text-info"
                    aria-hidden="true"
                  />
                </div>
                Comprobante por email
              </div>
            </div>

            <div className="space-y-3">
              <Button
                className="h-auto min-h-12 w-full gap-2 py-3"
                size="lg"
                onClick={onStripe}
                disabled={disabled}
                aria-busy={payingStripe}
              >
                {payingStripe ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                )}
                {payingStripe
                  ? "Redirigiendo a Stripe..."
                  : `Pagar con tarjeta ${formatAmount(
                      link.amount,
                      link.currency
                    )}`}
              </Button>

              <Button
                className="h-auto min-h-12 w-full gap-2 py-3"
                size="lg"
                variant="outline"
                onClick={onWompi}
                disabled={disabled}
                aria-busy={payingWompi}
              >
                {payingWompi ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                )}
                {payingWompi
                  ? "Redirigiendo a Wompi..."
                  : "Pagar con Wompi (Colombia)"}
              </Button>
            </div>

            <p className="text-center text-sm leading-relaxed text-muted-foreground">
              Al pagar, aceptas los términos y condiciones de{" "}
              {link.organizationName}.
            </p>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}

export default function PayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [link, setLink] = useState<PaymentLinkData | null>(null);
  const [status, setStatus] = useState<PaymentStatus>(
    slug ? "loading" : "not-found"
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [payingStripe, setPayingStripe] = useState(false);
  const [payingWompi, setPayingWompi] = useState(false);

  const success = searchParams.get("success") === "true";
  const wompiSuccess = searchParams.get("wompi") === "success";
  const canceled = searchParams.get("canceled") === "true";

  useEffect(() => {
    if (!slug) return;

    fetch(`/api/payment-links/public/${slug}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new PaymentLinkError(
            resolveErrorStatus(r.status, data.error),
            data.error || "Error al cargar"
          );
        }
        setLink(data);
        setStatus("active");
      })
      .catch((err) => {
        if (err instanceof PaymentLinkError) {
          setStatus(err.status);
          setStatusMessage(err.message);
        } else {
          setStatus("error");
          setStatusMessage("Error de red");
        }
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
        setStatus("error");
        setStatusMessage("Error al iniciar pago con Stripe");
      }
    } catch {
      setStatus("error");
      setStatusMessage("Error de red");
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
        setStatus("error");
        setStatusMessage(data.error);
      } else {
        setStatus("error");
        setStatusMessage("Error al iniciar pago con Wompi");
      }
    } catch {
      setStatus("error");
      setStatusMessage("Error de red");
    } finally {
      setPayingWompi(false);
    }
  }

  if (success || wompiSuccess) {
    return <SuccessState link={link} />;
  }

  if (canceled) {
    return <CanceledState />;
  }

  if (status === "loading") {
    return <LoadingState />;
  }

  if (status === "not-found") {
    return <NotFoundState />;
  }

  if (status === "expired") {
    return <ExpiredState />;
  }

  if (status === "limit-reached") {
    return <LimitReachedState />;
  }

  if (status === "error") {
    return <ErrorState message={statusMessage || "Error al cargar"} />;
  }

  if (!link) {
    return <ErrorState message="Error al cargar" />;
  }

  return (
    <PaymentForm
      link={link}
      payingStripe={payingStripe}
      payingWompi={payingWompi}
      onStripe={handleStripePayment}
      onWompi={handleWompiPayment}
    />
  );
}
