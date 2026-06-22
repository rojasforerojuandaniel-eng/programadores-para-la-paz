"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { isLocale, DEFAULT_LOCALE, type Locale } from "@/lib/locale";
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

function usePayLocale(): Locale {
  const raw = useLocale();
  return isLocale(raw) ? raw : DEFAULT_LOCALE;
}

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

function formatAmount(
  amount: number,
  currency: string,
  locale: Locale
): string {
  return formatCurrency(amount, currency, locale);
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
  const t = useTranslations("pay");
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background px-4 pb-safe"
      role="status"
      aria-live="polite"
      aria-label={t("loading")}
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
  const t = useTranslations("pay");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pb-safe">
      <StatusCard
        tone="danger"
        title={t("notFound.title")}
        message={t("notFound.message")}
      >
        <Button asChild variant="outline" className="w-full gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("back")}
          </Link>
        </Button>
      </StatusCard>
    </div>
  );
}

function ExpiredState() {
  const t = useTranslations("pay");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pb-safe">
      <StatusCard
        tone="warning"
        title={t("expired.title")}
        message={t("expired.message")}
      >
        <Button asChild variant="outline" className="w-full gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("back")}
          </Link>
        </Button>
      </StatusCard>
    </div>
  );
}

function LimitReachedState() {
  const t = useTranslations("pay");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pb-safe">
      <StatusCard
        tone="warning"
        title={t("limit.title")}
        message={t("limit.message")}
      >
        <Button asChild variant="outline" className="w-full gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("back")}
          </Link>
        </Button>
      </StatusCard>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  const t = useTranslations("pay");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pb-safe">
      <StatusCard
        tone="danger"
        title={t("errorState.title")}
        message={message}
      >
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="w-full gap-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t("retry")}
        </Button>
      </StatusCard>
    </div>
  );
}

function SuccessState({ link }: { link: PaymentLinkData | null }) {
  const t = useTranslations("pay");
  const locale = usePayLocale();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pb-safe">
      <StatusCard
        tone="success"
        title={t("success.title")}
        message={
          link
            ? t("success.messageWithOrg", {
                org: link.organizationName,
                amount: formatAmount(link.amount, link.currency, locale),
              })
            : t("success.message")
        }
      >
        <p className="text-sm text-muted-foreground">
          {t("success.receiptNote")}
        </p>
        <Button asChild variant="outline" className="w-full gap-2">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("back")}
          </Link>
        </Button>
      </StatusCard>
    </div>
  );
}

function CanceledState() {
  const t = useTranslations("pay");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 pb-safe">
      <StatusCard
        tone="info"
        title={t("canceled.title")}
        message={t("canceled.message")}
      >
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="w-full gap-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t("retry")}
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
  const t = useTranslations("pay");
  const locale = usePayLocale();
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
            {t("securePaymentsFor", { org: link.organizationName })}
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
              <div className="text-sm text-muted-foreground">
                {t("amount")}
              </div>
              <div className="mt-1 text-4xl font-bold text-foreground">
                {formatAmount(link.amount, link.currency, locale)}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <Badge variant="outline">{link.currency}</Badge>
                {link.maxPayments && (
                  <Badge variant="outline">
                    {t("paymentsCount", {
                      current: link.currentPayments,
                      max: link.maxPayments,
                    })}
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
                {t("securePayment")}
              </div>
              <div className="flex items-center gap-3 text-sm text-foreground">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-info/15">
                  <CreditCard
                    className="h-4 w-4 text-info"
                    aria-hidden="true"
                  />
                </div>
                {t("emailReceipt")}
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
                  ? t("stripeRedirecting")
                  : t("stripePay", {
                      amount: formatAmount(link.amount, link.currency, locale),
                    })}
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
                {payingWompi ? t("wompiRedirecting") : t("wompiPay")}
              </Button>
            </div>

            <p className="text-center text-sm leading-relaxed text-muted-foreground">
              {t("termsAccept", { org: link.organizationName })}
            </p>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}

export default function PayPage() {
  const t = useTranslations("pay");
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
            data.error || t("error.load")
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
          setStatusMessage(t("error.network"));
        }
      });
  }, [slug, t]);

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
        setStatusMessage(t("error.stripeStart"));
      }
    } catch {
      setStatus("error");
      setStatusMessage(t("error.network"));
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
        setStatusMessage(t("error.wompiStart"));
      }
    } catch {
      setStatus("error");
      setStatusMessage(t("error.network"));
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
    return <ErrorState message={statusMessage || t("error.load")} />;
  }

  if (!link) {
    return <ErrorState message={t("error.load")} />;
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