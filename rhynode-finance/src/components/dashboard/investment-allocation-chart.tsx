"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useIsClient } from "@/hooks/use-is-client";

interface AllocationItem {
  type: string;
  label: string;
  value: number;
  amount: number;
}

interface InvestmentAllocationChartProps {
  data: AllocationItem[];
  currency: string;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

const COLORS = [
  "var(--primary)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

export function InvestmentAllocationChartSkeleton() {
  return (
    <div className="h-[240px] w-full animate-pulse rounded-xl bg-muted sm:h-[280px]" />
  );
}

export function InvestmentAllocationChart({
  data,
  currency,
}: InvestmentAllocationChartProps) {
  const isClient = useIsClient();
  if (!isClient || data.length === 0) return null;

  return (
    <div className="h-[240px] w-full sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${entry.type}`}
                fill={COLORS[index % COLORS.length]}
                stroke="var(--card)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name, item: any) => {
              const entry = item?.payload;
              return [
                `${formatCurrency(entry?.amount ?? 0, currency)} (${Number(entry?.value ?? 0).toFixed(1)}%)`,
                entry?.label ?? name,
              ];
            }}
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              color: "var(--card-foreground)",
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => (
              <span className="text-xs text-muted-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
