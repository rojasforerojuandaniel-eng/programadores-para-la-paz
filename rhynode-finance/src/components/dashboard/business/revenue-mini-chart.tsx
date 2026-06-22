import { decimalToNumber } from "@/lib/decimal";
import { getPrisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RevenueChartClient } from "./revenue-chart-client";
import { TrendingUp } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale, type Locale } from "@/lib/locale-server";
import { formatCurrency, formatDate as fmtDate } from "@/lib/format";

function getMonthName(date: Date, locale: Locale) {
  return fmtDate(date, locale, { month: "short" });
}

function getMonthlyRevenueStart(months: number) {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1, 0, 0, 0),
  );
}

function monthBucketIndex(date: Date, start: Date) {
  return (
    (date.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (date.getUTCMonth() - start.getUTCMonth())
  );
}

const MONTHS = 6;

interface RevenueMiniChartProps {
  orgId: string;
  currency: string;
  className?: string;
}

export async function RevenueMiniChart({
  orgId,
  currency,
  className,
}: RevenueMiniChartProps) {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.home" });
  const prisma = getPrisma();
  const start = getMonthlyRevenueStart(MONTHS);

  const paidInvoices = await prisma.invoice.findMany({
    where: {
      organizationId: orgId,
      status: "PAID",
      issueDate: { gte: start },
    },
    select: { issueDate: true, total: true },
    orderBy: { issueDate: "asc" },
  });

  const startDate = new Date(start);
  const data = Array.from({ length: MONTHS }, (_, index) => {
    const date = new Date(startDate);
    date.setUTCMonth(date.getUTCMonth() + index);
    return {
      month: getMonthName(date, locale),
      amount: 0,
    };
  });

  for (const invoice of paidInvoices) {
    const idx = monthBucketIndex(invoice.issueDate, startDate);
    if (idx >= 0 && idx < MONTHS) {
      data[idx].amount += decimalToNumber(invoice.total);
    }
  }

  const totalRevenue = data.reduce((sum, item) => sum + item.amount, 0);
  const summary = t("business.revenue.summary", {
    months: MONTHS,
    total: formatCurrency(totalRevenue, currency, locale),
  });

  return (
    <Card className={cn("surface-elevated-2", className)}>
      <CardHeader>
        <CardTitle className="heading-card flex items-center gap-2">
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          {t("business.revenue.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RevenueChartClient data={data} currency={currency} summary={summary} />
        <p className="mt-2 text-xs text-muted-foreground">
          {t("business.revenue.totalLabel", {
            months: MONTHS,
            total: formatCurrency(totalRevenue, currency, locale),
          })}
        </p>
      </CardContent>
    </Card>
  );
}
