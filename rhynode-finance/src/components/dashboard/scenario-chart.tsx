"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/lib/locale";

export interface ScenarioData {
  month: string;
  base: number;
  optimistic: number;
  pessimistic: number;
}

export function ScenarioChartSkeleton() {
  return (
    <div
      className="h-[300px] w-full animate-pulse rounded-xl bg-muted sm:h-[400px]"
      aria-hidden="true"
    />
  );
}

export function ScenarioChart({ data }: { data: ScenarioData[] }) {
  const t = useTranslations("dashboard.scenarios");
  const locale = useLocale() as Locale;
  const monthCount = data.length;
  return (
    <div
      className="h-[300px] w-full sm:h-[400px]"
      role="img"
      aria-label={t("chart.balanceAriaLabel", { months: monthCount })}
    >
      <span className="sr-only">
        {t("chart.balanceSrOnly", { months: monthCount })}
      </span>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorOptimistic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--emerald-500, #10b981)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--emerald-500, #10b981)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorPessimistic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--rose-500, #f43f5e)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--rose-500, #f43f5e)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value), "COP", locale)}
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              color: "var(--card-foreground)",
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="pessimistic"
            name={t("types.pessimistic")}
            stroke="var(--rose-500, #f43f5e)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorPessimistic)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="base"
            name={t("types.base")}
            stroke="var(--primary)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorBase)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="optimistic"
            name={t("types.optimistic")}
            stroke="var(--emerald-500, #10b981)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorOptimistic)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}