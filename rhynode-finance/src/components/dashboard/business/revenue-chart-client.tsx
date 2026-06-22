"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/lib/locale";

interface RevenueChartClientProps {
  data: { month: string; amount: number }[];
  currency: string;
  summary: string;
  className?: string;
}

export function RevenueChartClient({
  data,
  currency,
  summary,
  className,
}: RevenueChartClientProps) {
  const t = useTranslations("charts.revenue");
  const locale = useLocale() as Locale;
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

  const formatCompact = (amount: number) =>
    formatCurrency(amount, currency, locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    });

  return (
    <div className={cn("h-48 w-full", className)}>
      <div
        role="img"
        aria-label={summary}
        className="h-full w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCompact(value)}
            />
            <Tooltip
              formatter={(value) => {
                const amount = typeof value === "number" ? value : 0;
                return [formatCompact(amount), t("series")];
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                borderColor: "hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
            />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.amount === maxAmount
                      ? "hsl(var(--primary))"
                      : "hsl(var(--primary) / 0.5)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{t("srCaption")}</caption>
        <thead>
          <tr>
            <th>{t("srMonthHeader")}</th>
            <th>{t("srIncomeHeader")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <td>{d.month}</td>
              <td>{formatCompact(d.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
