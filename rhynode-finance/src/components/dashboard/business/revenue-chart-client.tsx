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
import { cn } from "@/lib/utils";

interface RevenueChartClientProps {
  data: { month: string; amount: number }[];
  currency: string;
  summary: string;
  className?: string;
}

function formatCurrencyCompact(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function RevenueChartClient({
  data,
  currency,
  summary,
  className,
}: RevenueChartClientProps) {
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

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
              tickFormatter={(value: number) =>
                formatCurrencyCompact(value, currency)
              }
            />
            <Tooltip
              formatter={(value) => {
                const amount = typeof value === "number" ? value : 0;
                return [formatCurrencyCompact(amount, currency), "Ingresos"];
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
        <caption>Ingresos mensuales por mes</caption>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Ingresos</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <td>{d.month}</td>
              <td>{formatCurrencyCompact(d.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
