"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SubscriptionStatusActions,
  SubscriptionStatus,
} from "./subscription-status-actions";
import { formatCurrency, formatDate as fmtDate } from "@/lib/format";
import type { Locale } from "@/lib/locale";
import {
  CreditCard,
  Activity,
  ArrowUp,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Clock,
  RefreshCw,
} from "lucide-react";

export type SubscriptionView = {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  frequency: "MONTHLY" | "QUARTERLY" | "YEARLY";
  provider: string | null;
  category: string | null;
  status: SubscriptionStatus;
  canceledAt: Date | null;
  cancellationUrl: string | null;
  lastDetectedAt: Date;
  lastPaidAt: Date | null;
  createdAt: Date;
  nextChargeDate: Date | null;
  increased: boolean;
  unused: boolean;
};

interface SubscriptionManagerProps {
  subscriptions: SubscriptionView[];
  kpis: {
    monthlySpend: number;
    annualSpend: number;
    activeCount: number;
    nextRenewal: Date | null;
    totalCount: number;
  };
  currency: string;
  initialFilter: string;
}

const FILTER_KEYS = ["ACTIVE", "PENDING_CANCELLATION", "CANCELED", "ALL"] as const;

const statusBadgeConfig: Record<
  SubscriptionStatus,
  { variant: "default" | "secondary" | "outline" | "destructive"; labelKey: string }
> = {
  ACTIVE: { variant: "default", labelKey: "statuses.ACTIVE" },
  PENDING_CANCELLATION: { variant: "outline", labelKey: "statuses.PENDING_CANCELLATION" },
  CANCELED: { variant: "secondary", labelKey: "statuses.CANCELED" },
};

const frequencyLabelKey: Record<string, string> = {
  MONTHLY: "frequencies.MONTHLY",
  QUARTERLY: "frequencies.QUARTERLY",
  YEARLY: "frequencies.YEARLY",
};

function monthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case "MONTHLY":
      return amount;
    case "QUARTERLY":
      return amount / 3;
    case "YEARLY":
      return amount / 12;
    default:
      return amount;
  }
}

function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  return Math.ceil(
    (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const t = useTranslations("dashboard.subscriptions");
  const { variant, labelKey } = statusBadgeConfig[status];
  return <Badge variant={variant}>{t(labelKey as never)}</Badge>;
}

export function SubscriptionManager({
  subscriptions,
  kpis,
  currency,
  initialFilter,
}: SubscriptionManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("dashboard.subscriptions");
  const locale = useLocale() as Locale;
  const [filter, setFilter] = useState(initialFilter);

  function handleFilterChange(value: string) {
    setFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") {
      params.delete("filter");
    } else {
      params.set("filter", value);
    }
    router.push(`/dashboard/personal/subscriptions?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">{t("managerSubtitle")}</p>
        </div>
        <form action="/api/personal/subscriptions/detect" method="POST">
          <Button type="submit" className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t("detect")}
          </Button>
        </form>
      </div>

      <Tabs
        value={filter}
        onValueChange={handleFilterChange}
        className="w-full"
      >
        <TabsList
          className="w-full sm:w-auto"
          aria-label={t("filterAriaLabel")}
        >
          {FILTER_KEYS.map((value) => (
            <TabsTrigger key={value} value={value}>
              {t(`filters.${value}` as never)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t("kpis.monthlySpend")}
          value={formatCurrency(kpis.monthlySpend, currency, locale)}
          icon={Wallet}
        />
        <KpiCard
          label={t("kpis.annualSpend")}
          value={formatCurrency(kpis.annualSpend, currency, locale)}
          icon={TrendingUp}
        />
        <KpiCard
          label={t("kpis.activeCount")}
          value={kpis.activeCount}
          icon={Activity}
        />
        <KpiCard
          label={t("kpis.nextRenewal")}
          value={
            kpis.nextRenewal ? (
              fmtDate(kpis.nextRenewal, locale)
            ) : (
              "—"
            )
          }
          icon={Clock}
          footer={
            kpis.nextRenewal
              ? t("daysCount", { count: daysUntil(kpis.nextRenewal) ?? 0 })
              : undefined
          }
        />
      </div>

      <div aria-live="polite" aria-atomic="false">
        {subscriptions.length === 0 ? (
          <EmptyStateCard
            icon={CreditCard}
            title={t("emptyFiltered.title")}
            description={t("emptyFiltered.description")}
            hint={t("emptyFiltered.hint")}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead scope="col">{t("columns.name")}</TableHead>
                    <TableHead scope="col">{t("columns.amount")}</TableHead>
                    <TableHead scope="col">{t("columns.frequency")}</TableHead>
                    <TableHead scope="col">{t("columns.nextCharge")}</TableHead>
                    <TableHead scope="col">{t("columns.status")}</TableHead>
                    <TableHead scope="col" className="text-right">
                      {t("columns.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{sub.name}</span>
                          <div className="flex flex-wrap gap-1">
                            {sub.unused && (
                              <Badge
                                variant="outline"
                                className="gap-1 border-amber-700/30 text-amber-700"
                              >
                                <AlertTriangle className="h-3 w-3" aria-hidden="true" /> {t("unused")}
                              </Badge>
                            )}
                            {sub.increased && (
                              <Badge
                                variant="outline"
                                className="gap-1 border-rose-700/30 text-rose-700"
                              >
                                <ArrowUp className="h-3 w-3" aria-hidden="true" /> {t("increased")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {formatCurrency(sub.amount, sub.currency, locale)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(
                              monthlyEquivalent(sub.amount, sub.frequency),
                              sub.currency,
                              locale
                            )}{" "}
                            {t("perMonth")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {t(frequencyLabelKey[sub.frequency] as never)}
                      </TableCell>
                      <TableCell className="py-3">
                        {sub.nextChargeDate ? (
                          <div className="flex flex-col">
                            <span>
                              {fmtDate(sub.nextChargeDate, locale)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {t("daysCount", { count: daysUntil(sub.nextChargeDate) ?? 0 })}
                            </span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <StatusBadge status={sub.status} />
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <SubscriptionStatusActions
                          id={sub.id}
                          status={sub.status}
                          cancellationUrl={sub.cancellationUrl}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul
              className="grid grid-cols-1 gap-4 md:hidden"
              role="list"
              aria-label={t("listAriaLabel")}
            >
              {subscriptions.map((sub) => (
                <li key={sub.id}>
                  <Card className="surface-elevated-2 rounded-xl border-border">
                    <CardContent className="flex flex-col gap-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{sub.name}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {sub.unused && (
                              <Badge
                                variant="outline"
                                className="gap-1 border-amber-700/30 text-amber-700"
                              >
                                <AlertTriangle className="h-3 w-3" aria-hidden="true" /> {t("unused")}
                              </Badge>
                            )}
                            {sub.increased && (
                              <Badge
                                variant="outline"
                                className="gap-1 border-rose-700/30 text-rose-700"
                              >
                                <ArrowUp className="h-3 w-3" aria-hidden="true" /> {t("increased")}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={sub.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="text-muted-foreground">{t("columns.amount")}</div>
                        <div className="text-right font-medium">
                          {formatCurrency(sub.amount, sub.currency, locale)}
                        </div>
                        <div className="text-muted-foreground">{t("monthlyLabel")}</div>
                        <div className="text-right">
                          {formatCurrency(
                            monthlyEquivalent(sub.amount, sub.frequency),
                            sub.currency,
                            locale
                          )}
                        </div>
                        <div className="text-muted-foreground">{t("columns.frequency")}</div>
                        <div className="text-right">
                          {t(frequencyLabelKey[sub.frequency] as never)}
                        </div>
                        <div className="text-muted-foreground">{t("columns.nextCharge")}</div>
                        <div className="text-right">
                          {sub.nextChargeDate
                            ? fmtDate(sub.nextChargeDate, locale)
                            : "—"}
                        </div>
                      </div>
                      <div className="flex justify-end pt-1">
                        <SubscriptionStatusActions
                          id={sub.id}
                          status={sub.status}
                          cancellationUrl={sub.cancellationUrl}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
