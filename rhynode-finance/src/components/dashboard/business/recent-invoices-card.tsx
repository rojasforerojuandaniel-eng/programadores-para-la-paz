import Link from "next/link";
import { decimalToNumber } from "@/lib/decimal";
import { getPrisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { FileText, Plus, Receipt } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale } from "@/lib/locale-server";
import { formatCurrency, formatDate as fmtDate } from "@/lib/format";

const statusConfig: Record<string, { labelKey: string; className: string }> = {
  DRAFT: { labelKey: "business.recentInvoices.statuses.DRAFT", className: "bg-slate-100 text-slate-700" },
  SENT: { labelKey: "business.recentInvoices.statuses.SENT", className: "bg-amber-50 text-amber-800" },
  PAID: { labelKey: "business.recentInvoices.statuses.PAID", className: "bg-emerald-50 text-emerald-800" },
  OVERDUE: { labelKey: "business.recentInvoices.statuses.OVERDUE", className: "bg-rose-50 text-rose-700" },
  CANCELLED: { labelKey: "business.recentInvoices.statuses.CANCELLED", className: "bg-slate-100 text-slate-700" },
  PARTIAL: { labelKey: "business.recentInvoices.statuses.PARTIAL", className: "bg-blue-50 text-blue-700" },
};

async function StatusBadge({ status }: { status: string }) {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.home" });
  const config = statusConfig[status] || statusConfig.DRAFT;
  return (
    <Badge variant="outline" className={config.className}>
      {t(config.labelKey as never)}
    </Badge>
  );
}

interface RecentInvoicesCardProps {
  orgId: string;
  currency: string;
  className?: string;
}

export async function RecentInvoicesCard({
  orgId,
  currency,
  className,
}: RecentInvoicesCardProps) {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.home" });
  const prisma = getPrisma();
  const invoices = await prisma.invoice.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { client: { select: { name: true } } },
  });

  const empty = invoices.length === 0;

  return (
    <Card className={cn("surface-elevated-2", className)}>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="heading-card flex items-center gap-2">
          <FileText className="h-4 w-4" aria-hidden="true" />
          {t("business.recentInvoices.title")}
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/invoices">{t("business.recentInvoices.viewAll")}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {empty ? (
          <EmptyStateCard
            variant="sm"
            className="border-0 bg-transparent shadow-none"
            icon={Receipt}
            title={t("business.recentInvoices.empty.title")}
            description={t("business.recentInvoices.empty.description")}
            action={
              <Button size="sm" className="gap-1" asChild>
                <Link href="/dashboard/invoices">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t("business.recentInvoices.empty.action")}
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {invoices.map((invoice) => (
              <li
                key={invoice.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {invoice.client?.name || t("business.recentInvoices.defaultClient")}
                  </p>
                  <p className="body-small text-muted-foreground">
                    {invoice.number} ·{" "}
                    {fmtDate(new Date(invoice.issueDate), locale)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={invoice.status} />
                  <span className="text-sm font-semibold">
                    {formatCurrency(
                      decimalToNumber(invoice.total),
                      invoice.currency || currency,
                      locale,
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
