"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface ScenarioData {
  month: string;
  baseline: number;
  projected: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ScenarioChartSkeleton() {
  return (
    <div className="h-[300px] w-full animate-pulse rounded-xl bg-muted sm:h-[400px]" />
  );
}

export function ScenarioChart({ data }: { data: ScenarioData[] }) {
  return (
    <div className="h-[300px] w-full sm:h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
          <YAxis
            tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
            tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              color: "var(--card-foreground)",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="baseline"
            name="Base"
            stroke="var(--muted-foreground)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="projected"
            name="Proyectado"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
