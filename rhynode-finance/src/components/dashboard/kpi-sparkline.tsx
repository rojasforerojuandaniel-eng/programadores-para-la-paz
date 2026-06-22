"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useTranslations, useLocale } from "next-intl";
import { formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/locale";

interface KpiSparklineProps {
  data: number[];
  positive: boolean;
  label: string;
}

export function KpiSparkline({ data, positive, label }: KpiSparklineProps) {
  const t = useTranslations("charts.kpiSparkline");
  const locale = useLocale() as Locale;
  if (data.length === 0) return null;

  const chartData = data.map((value, index) => ({ index, value }));
  const color = positive
    ? "var(--emerald-500, #10b981)"
    : "var(--rose-500, #f43f5e)";
  const fillId = `sparkline-gradient-${positive ? "pos" : "neg"}`;
  const trendDescription = data.map((v) => formatNumber(v, locale)).join(", ");

  return (
    <figure
      className="w-full"
      aria-label={t("trendAriaLabel", { label, values: trendDescription })}
    >
      <figcaption className="sr-only">
        {t("trendCaption", { label, values: trendDescription })}
      </figcaption>
      <div className="h-10 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${fillId})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
