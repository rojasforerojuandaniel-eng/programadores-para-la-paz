"use client";

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

export interface ScenarioData {
  month: string;
  base: number;
  optimistic: number;
  pessimistic: number;
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
    <div
      className="h-[300px] w-full animate-pulse rounded-xl bg-muted sm:h-[400px]"
      aria-hidden="true"
    />
  );
}

export function ScenarioChart({ data }: { data: ScenarioData[] }) {
  const monthCount = data.length;
  return (
    <div
      className="h-[300px] w-full sm:h-[400px]"
      role="img"
      aria-label={`Gráfico de proyección de saldo a ${monthCount} meses. Muestra tres escenarios: base, optimista (+10% ingresos, -5% gastos) y pesimista (-10% ingresos, +10% gastos).`}
    >
      <span className="sr-only">
        Proyección de saldo a {monthCount} meses. Los valores varían según el
        escenario seleccionado.
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
            formatter={(value) => formatCurrency(Number(value))}
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
            name="Pesimista"
            stroke="var(--rose-500, #f43f5e)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorPessimistic)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="base"
            name="Base"
            stroke="var(--primary)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorBase)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="optimistic"
            name="Optimista"
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
