"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableCell } from "@/components/ui/table";
import { CreatePaymentLinkDialog } from "@/components/dashboard/create-payment-link-dialog";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { DataTable } from "@/components/dashboard/data-table";
import {
  PaymentLinkActions,
  CopyLinkButton,
  QrDialog,
  getPublicUrl,
  type PaymentLink,
} from "@/components/dashboard/payment-link-actions";
import { formatCurrency, formatDate as fmtDate } from "@/lib/format";
import type { Locale } from "@/lib/locale";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  Link2,
  CheckCircle2,
  AlertCircle,
  DollarSign,
} from "lucide-react";

const statusConfig: Record<string, { labelKey: string; className: string }> = {
  ACTIVE: {
    labelKey: "statuses.ACTIVE",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  },
  INACTIVE: {
    labelKey: "statuses.INACTIVE",
    className: "border-gray-500/20 bg-gray-500/10 text-gray-600",
  },
  EXPIRED: {
    labelKey: "statuses.EXPIRED",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-600",
  },
  EXHAUSTED: {
    labelKey: "statuses.EXHAUSTED",
    className: "border-red-500/20 bg-red-500/10 text-red-600",
  },
};

function formatUses(link: PaymentLink, noLimitLabel: string): string {
  if (link.maxPayments) return `${link.currentPayments} / ${link.maxPayments}`;
  return `${link.currentPayments} · ${noLimitLabel}`;
}

function formatDate(
  value: string | null,
  neverLabel: string,
  locale: Locale
): string {
  if (!value) return neverLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return fmtDate(value, locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getEffectiveStatus(link: PaymentLink): string {
  if (link.maxPayments && link.currentPayments >= link.maxPayments) {
    return "EXHAUSTED";
  }
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return "EXPIRED";
  }
  return link.status;
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("dashboard.paymentLinks");
  const config = statusConfig[status] || statusConfig.ACTIVE;
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", config.className)}
    >
      {t(config.labelKey as never)}
    </Badge>
  );
}

interface PaymentLinksClientProps {
  initialLinks: PaymentLink[];
  canEdit: boolean;
}

export function PaymentLinksClient({
  initialLinks,
  canEdit,
}: PaymentLinksClientProps) {
  const t = useTranslations("dashboard.paymentLinks");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const refresh = () => router.refresh();

  const kpis = useMemo(() => {
    const active = initialLinks.filter((link) => link.status === "ACTIVE");
    const activeAmount = active.reduce((sum, link) => sum + link.amount, 0);
    const totalPayments = initialLinks.reduce(
      (sum, link) => sum + link.currentPayments,
      0
    );
    const inactive = initialLinks.length - active.length;
    return { activeCount: active.length, activeAmount, totalPayments, inactive };
  }, [initialLinks]);

  const columns = [
    { key: "name", header: t("columns.name") },
    { key: "amount", header: t("columns.amount") },
    { key: "status", header: t("columns.status") },
    { key: "uses", header: t("columns.uses") },
    { key: "expires", header: t("columns.expires") },
    { key: "actions", header: t("columns.actions"), className: "text-right" },
  ];

  function renderRow(link: PaymentLink) {
    const effectiveStatus = getEffectiveStatus(link);
    return (
      <>
        <TableCell className="font-medium">{link.name}</TableCell>
        <TableCell>{formatCurrency(link.amount, link.currency, locale)}</TableCell>
        <TableCell>
          <StatusBadge status={effectiveStatus} />
        </TableCell>
        <TableCell className="text-sm">{formatUses(link, t("uses.noLimit"))}</TableCell>
        <TableCell className="text-sm">{formatDate(link.expiresAt, t("dates.never"), locale)}</TableCell>
        <TableCell className="text-right">
          <PaymentLinkActions
            link={link}
            onRefresh={refresh}
            canEdit={canEdit}
          />
        </TableCell>
      </>
    );
  }

  function renderCard(link: PaymentLink) {
    const effectiveStatus = getEffectiveStatus(link);
    const publicUrl = getPublicUrl(link);
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-medium">{link.name}</div>
            <div className="text-lg font-semibold">
              {formatCurrency(link.amount, link.currency, locale)}
            </div>
          </div>
          <StatusBadge status={effectiveStatus} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">{t("cardLabels.uses")}</span>
            <div className="font-medium">{formatUses(link, t("uses.noLimit"))}</div>
          </div>
          <div>
            <span className="text-muted-foreground">{t("cardLabels.expires")}</span>
            <div className="font-medium">{formatDate(link.expiresAt, t("dates.never"), locale)}</div>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <CopyLinkButton url={publicUrl} />
          <QrDialog url={publicUrl} name={link.name} />
          <PaymentLinkActions
            link={link}
            onRefresh={refresh}
            canEdit={canEdit}
            className="ml-auto"
          />
        </div>
      </div>
    );
  }

  const emptyState = (
    <EmptyStateCard
      variant="lg"
      icon={CreditCard}
      title={t("empty.title")}
      description={t("empty.description")}
      hint={t("empty.hint")}
      action={<CreatePaymentLinkDialog onCreate={refresh} />}
    />
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">
            {t("subtitle")}
          </p>
        </div>
        <CreatePaymentLinkDialog onCreate={refresh} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <KpiCard label={t("kpis.active")} value={kpis.activeCount} icon={Link2} />
        <KpiCard
          label={t("kpis.activeAmount")}
          value={formatCurrency(kpis.activeAmount, "COP", locale)}
          icon={DollarSign}
        />
        <KpiCard
          label={t("kpis.receivedPayments")}
          value={kpis.totalPayments}
          icon={CheckCircle2}
        />
        <KpiCard label={t("kpis.inactive")} value={kpis.inactive} icon={AlertCircle} />
      </div>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card">{t("cardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={initialLinks}
            renderRow={renderRow}
            renderCard={renderCard}
            loading={false}
            emptyState={emptyState}
          />
        </CardContent>
      </Card>
    </div>
  );
}