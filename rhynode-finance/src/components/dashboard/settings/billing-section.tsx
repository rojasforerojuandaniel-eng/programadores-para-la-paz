"use client";

import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import {
  CreditCard,
  ExternalLink,
  Zap,
  Receipt,
  Users,
  CheckCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertCircle,
  Check,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate as fmtDate, formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/locale";

interface Plan {
  name: string;
  invoicesUsed: number;
  invoicesLimit: number;
  usersUsed: number;
  usersLimit: number;
}

interface PaymentItem {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface BillingSectionProps {
  plan: Plan;
  usagePercent: number;
  upgrading: boolean;
  saving: boolean;
  payments?: PaymentItem[];
  paymentsLoading?: boolean;
  onUpgrade: (targetPlan: "GROWTH" | "SCALE") => void;
}

const PLAN_DETAILS: Record<
  string,
  {
    priceKey: string;
    periodKey: string;
    descriptionKey: string;
    featureKeys: string[];
    unavailableKeys?: string[];
  }
> = {
  Starter: {
    priceKey: "billing.plans.starter.price",
    periodKey: "billing.plans.starter.period",
    descriptionKey: "billing.plans.starter.description",
    featureKeys: [
      "billing.plans.starter.features.f1",
      "billing.plans.starter.features.f2",
      "billing.plans.starter.features.f3",
      "billing.plans.starter.features.f4",
      "billing.plans.starter.features.f5",
    ],
    unavailableKeys: [
      "billing.plans.starter.unavailable.u1",
      "billing.plans.starter.unavailable.u2",
      "billing.plans.starter.unavailable.u3",
    ],
  },
  Growth: {
    priceKey: "billing.plans.growth.price",
    periodKey: "billing.plans.growth.period",
    descriptionKey: "billing.plans.growth.description",
    featureKeys: [
      "billing.plans.growth.features.f1",
      "billing.plans.growth.features.f2",
      "billing.plans.growth.features.f3",
      "billing.plans.growth.features.f4",
      "billing.plans.growth.features.f5",
      "billing.plans.growth.features.f6",
    ],
    unavailableKeys: [
      "billing.plans.growth.unavailable.u1",
      "billing.plans.growth.unavailable.u2",
    ],
  },
  Scale: {
    priceKey: "billing.plans.scale.price",
    periodKey: "billing.plans.scale.period",
    descriptionKey: "billing.plans.scale.description",
    featureKeys: [
      "billing.plans.scale.features.f1",
      "billing.plans.scale.features.f2",
      "billing.plans.scale.features.f3",
      "billing.plans.scale.features.f4",
      "billing.plans.scale.features.f5",
      "billing.plans.scale.features.f6",
      "billing.plans.scale.features.f7",
    ],
  },
};

const PLAN_ORDER = ["Starter", "Growth", "Scale"] as const;

type PlanName = (typeof PLAN_ORDER)[number];

const STATUS_LABEL_KEYS: Record<string, string> = {
  PAID: "billing.statuses.PAID",
  SUCCEEDED: "billing.statuses.PAID",
  PENDING: "billing.statuses.PENDING",
  FAILED: "billing.statuses.FAILED",
  REFUNDED: "billing.statuses.REFUNDED",
};

export function BillingSection({
  plan,
  usagePercent,
  upgrading,
  saving,
  payments = [],
  paymentsLoading = false,
  onUpgrade,
}: BillingSectionProps) {
  const t = useTranslations("dashboard.settings");
  const locale = useLocale() as Locale;

  function StatusBadge({ status }: { status: string }) {
    const labelKey = STATUS_LABEL_KEYS[status.toUpperCase()];
    if (labelKey) {
      const variantClassMap: Record<string, string> = {
        PAID: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
        SUCCEEDED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
        PENDING: "border-amber-500/20 bg-amber-500/10 text-amber-600",
        FAILED: "border-rose-500/20 bg-rose-500/10 text-rose-600",
        REFUNDED: "border-blue-500/20 bg-blue-500/10 text-blue-600",
      };
      return (
        <Badge variant="outline" className={variantClassMap[status.toUpperCase()]}>
          {t(labelKey as never)}
        </Badge>
      );
    }
    return <Badge variant="outline">{status}</Badge>;
  }

  async function openBillingPortal() {
    try {
      const res = await fetch("/api/subscribe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(t("billing.toasts.portalError"));
    } catch {
      toast.error(t("billing.toasts.portalError"));
    }
  }

  async function cancelSubscription() {
    if (!confirm(t("billing.cancelConfirm"))) return;
    try {
      const res = await fetch("/api/subscribe/cancel", { method: "POST" });
      if (res.ok) {
        trackEvent("subscription_cancel_marked");
        toast.success(t("billing.toasts.cancelSuccess"));
        window.location.reload();
      } else {
        toast.error(t("billing.toasts.cancelError"));
      }
    } catch {
      toast.error(t("billing.toasts.cancelError"));
    }
  }

  const providers = [
    {
      name: "Wompi",
      descKey: "billing.providers.wompi.desc",
      statusKey: "billing.providers.comingSoon",
    },
    {
      name: "PayU",
      descKey: "billing.providers.payu.desc",
      statusKey: "billing.providers.comingSoon",
    },
    {
      name: "PSE",
      descKey: "billing.providers.pse.desc",
      statusKey: "billing.providers.comingSoon",
    },
  ];

  const currentPlanName = plan.name || "Starter";
  const currentIndex = PLAN_ORDER.indexOf(currentPlanName as PlanName);
  const isLimitlessInvoices = plan.invoicesLimit === Infinity || plan.invoicesLimit >= 999999;
  const isLimitlessUsers = plan.usersLimit === Infinity || plan.usersLimit >= 999999;

  return (
    <div className="space-y-5">
      <Card className="surface-elevated-2">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="heading-card flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
            {t("billing.planUsageTitle")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {currentPlanName}
            </Badge>
            <Button type="submit" disabled={saving} size="sm" className="hidden sm:inline-flex">
              {t("saveChanges")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <KpiCard label={t("billing.kpis.plan")} value={currentPlanName} icon={TrendingUp} />
            <KpiCard
              label={t("billing.kpis.invoices")}
              value={
                isLimitlessInvoices
                  ? `${formatNumber(plan.invoicesUsed, locale)} / ∞`
                  : `${formatNumber(plan.invoicesUsed, locale)} / ${formatNumber(plan.invoicesLimit, locale)}`
              }
              icon={Receipt}
            />
            <KpiCard
              label={t("billing.kpis.users")}
              value={
                isLimitlessUsers
                  ? `${formatNumber(plan.usersUsed, locale)} / ∞`
                  : `${formatNumber(plan.usersUsed, locale)} / ${formatNumber(plan.usersLimit, locale)}`
              }
              icon={Users}
            />
            <KpiCard
              label={t("billing.kpis.usage")}
              value={`${usagePercent}%`}
              icon={CheckCircle}
              valueClassName={
                usagePercent >= 90
                  ? "text-danger"
                  : usagePercent >= 70
                    ? "text-warning"
                    : "text-success"
              }
            />
          </div>

          <div className="space-y-1">
            <ProgressBar
              value={isLimitlessInvoices ? 0 : plan.invoicesUsed}
              max={isLimitlessInvoices ? 100 : plan.invoicesLimit}
              colorClassName={
                usagePercent >= 90
                  ? "bg-danger"
                  : usagePercent >= 70
                    ? "bg-warning"
                    : "bg-primary"
              }
              label={isLimitlessInvoices ? t("billing.unlimitedUsage") : t("billing.usagePercent", { percent: usagePercent })}
            />
            <p className="text-xs text-muted-foreground">
              {isLimitlessInvoices
                ? t("billing.unlimitedInvoicesNote")
                : t("billing.usageLimitNote", { percent: usagePercent })}
            </p>
          </div>

          {usagePercent >= 80 && currentPlanName !== "Scale" && (
            <div className="flex items-start gap-3 rounded-lg bg-warning/10 p-3 text-sm text-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <div>
                <p className="font-medium">{t("billing.nearLimitTitle")}</p>
                <p className="text-muted-foreground">
                  {t("billing.nearLimitDesc")}
                </p>
              </div>
            </div>
          )}

          <Button type="submit" disabled={saving} className="w-full sm:hidden">
            {t("saveChanges")}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="heading-card">{t("billing.plansCompareTitle")}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLAN_ORDER.map((planName, index) => {
            const details = PLAN_DETAILS[planName];
            const isCurrent = currentPlanName === planName;
            const isUpgrade = index > currentIndex;
            const isDowngrade = index < currentIndex;

            return (
              <Card
                key={planName}
                className={cn(
                  "surface-elevated-1 flex flex-col",
                  isCurrent && "border-primary/30 ring-1 ring-primary/20"
                )}
              >
                <CardContent className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{planName}</span>
                        {isCurrent && <Badge>{t("billing.plans.current")}</Badge>}
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-foreground">{t(details.priceKey as never)}</span>
                        <span className="text-sm text-muted-foreground">{t(details.periodKey as never)}</span>
                      </div>
                    </div>
                    {isUpgrade && <ArrowUpRight className="h-5 w-5 text-success" aria-hidden="true" />}
                    {isDowngrade && <ArrowDownRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}
                  </div>

                  <p className="text-sm text-muted-foreground">{t(details.descriptionKey as never)}</p>

                  <ul className="my-4 flex-1 space-y-2">
                    {details.featureKeys.map((featureKey) => (
                      <li key={featureKey} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                        {t(featureKey as never)}
                      </li>
                    ))}
                    {details.unavailableKeys?.map((featureKey) => (
                      <li key={featureKey} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Minus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        {t(featureKey as never)}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      {t("billing.plans.currentButton")}
                    </Button>
                  ) : isDowngrade ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      aria-label={t("billing.plans.manageChangeAria")}
                      onClick={() => {
                        trackEvent("plan_downgrade_clicked", { targetPlan: planName.toUpperCase() });
                        openBillingPortal();
                      }}
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      {t("billing.plans.manageChange")}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="w-full"
                      aria-label={upgrading ? t("billing.plans.processingAria") : t("billing.plans.chooseAria", { plan: planName })}
                      onClick={() => {
                        trackEvent("plan_upgrade_clicked", { targetPlan: planName.toUpperCase() });
                        onUpgrade(planName.toUpperCase() as "GROWTH" | "SCALE");
                      }}
                      disabled={upgrading}
                    >
                      {upgrading ? t("billing.plans.processing") : t("billing.plans.choose", { plan: planName })}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" aria-hidden="true" />
            {t("billing.paymentsHistoryTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentsLoading ? (
            <div className="space-y-2">
              <div className="h-10 animate-pulse rounded bg-muted" />
              <div className="h-10 animate-pulse rounded bg-muted" />
              <div className="h-10 animate-pulse rounded bg-muted" />
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
              <Clock className="mb-2 h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">{t("billing.noPaymentsTitle")}</p>
              <p className="text-sm text-muted-foreground">
                {t("billing.noPaymentsDesc")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th scope="col" className="py-2 pr-4 font-medium">{t("billing.paymentCols.date")}</th>
                    <th scope="col" className="py-2 pr-4 font-medium">{t("billing.paymentCols.method")}</th>
                    <th scope="col" className="py-2 pr-4 font-medium">{t("billing.paymentCols.status")}</th>
                    <th scope="col" className="py-2 text-right font-medium">{t("billing.paymentCols.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 whitespace-nowrap text-foreground">
                        {fmtDate(payment.paidAt ?? payment.createdAt, locale, { year: "numeric", month: "short", day: "numeric" })}
                      </td>
                      <td className="py-3 pr-4 text-foreground">{payment.method}</td>
                      <td className="py-3 pr-4"><StatusBadge status={payment.status} /></td>
                      <td className="py-3 text-right font-medium text-foreground">
                        {formatCurrency(payment.amount, payment.currency, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
            {t("billing.subscriptionTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="body-default">
            {t("billing.subscriptionDesc")}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              aria-label={t("billing.billingPortalAria")}
              onClick={openBillingPortal}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {t("billing.billingPortalButton")}
            </Button>
            {currentPlanName !== "Starter" && (
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground hover:text-danger"
                aria-label={t("billing.cancelAria")}
                onClick={cancelSubscription}
              >
                {t("billing.cancelButton")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
            {t("billing.paymentMethodsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="body-default">
            {t("billing.paymentMethodsDesc")}
          </p>
          <ul role="list" aria-label={t("billing.providersAria")} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {providers.map((p) => (
              <li key={p.name} className="surface-elevated-1 rounded-lg p-4">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-muted-foreground">{t(p.descKey as never)}</div>
                <Button variant="outline" size="sm" className="mt-3 w-full" disabled>
                  {t(p.statusKey as never)}
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}