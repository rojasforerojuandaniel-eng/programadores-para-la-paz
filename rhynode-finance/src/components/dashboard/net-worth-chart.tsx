"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useIsClient } from "@/hooks/use-is-client";

interface NetWorthChartData {
  date: string;
  label: string;
  netWorth: number;
  assets: number;
  liabilities: number;
}

interface NetWorthChartProps {
  data: NetWorthChartData[];
  currency: string;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function NetWorthChartSkeleton() {
  return (
    <div className="h-[260px] w-full animate-pulse rounded-xl bg-muted sm:h-[320px]" />
  );
}

export function NetWorthChart({ data, currency }: NetWorthChartProps) {
  const isClient = useIsClient();
  if (!isClient || data.length === 0) return null;

  return (
    <div className="h-[260px] w-full sm:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <YAxis
            tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            width={48}
          />
          <Tooltip
            formatter={(value, name) => [
              formatCurrency(Number(value), currency),
              name === "netWorth" ? "Patrimonio" : name === "assets" ? "Activos" : "Deudas",
            ]}
            labelFormatter={(label) => label}
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              color: "var(--card-foreground)",
            }}
          />
          <Area
            type="monotone"
            dataKey="netWorth"
            name="Patrimonio"
            stroke="var(--primary)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorNetWorth)"
          />
          <Area
            type="monotone"
            dataKey="assets"
            name="Activos"
            stroke="var(--chart-2)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorAssets)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
