"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useIsClient } from "@/hooks/use-is-client";

interface XpBarChartProps {
  data: { week: string; label: string; xp: number }[];
}

export function XpBarChartSkeleton() {
  return (
    <div
      className="h-[220px] w-full animate-pulse rounded-xl bg-muted sm:h-[280px]"
      aria-hidden="true"
    />
  );
}

export function XpBarChart({ data }: XpBarChartProps) {
  const isClient = useIsClient();
  if (!isClient) return <XpBarChartSkeleton />;

  const maxXp = Math.max(...data.map((d) => d.xp), 1);

  return (
    <div
      className="h-[220px] w-full sm:h-[280px]"
      role="img"
      aria-label="Gráfico de barras de XP ganado por semana"
    >
      <span className="sr-only">
        XP ganado semana a semana:{" "}
        {data.map((d) => `${d.label}: ${d.xp} XP`).join(", ")}
      </span>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="xpBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.9} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [`${value} XP`, "XP ganado"]}
            labelFormatter={(label) => `Semana: ${label}`}
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              color: "var(--card-foreground)",
            }}
          />
          <Bar
            dataKey="xp"
            name="XP ganado"
            radius={[6, 6, 0, 0]}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.xp === maxXp ? "url(#xpBarGradient)" : "var(--primary)"
                }
                opacity={entry.xp > 0 ? 1 : 0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
