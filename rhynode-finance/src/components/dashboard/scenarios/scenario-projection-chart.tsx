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
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, type ScenarioProjectionMonth } from "@/lib/scenarios";

interface ScenarioProjectionChartProps {
  projection: ScenarioProjectionMonth[];
  currency?: string;
  title?: string;
}

function monthLabel(isoMonth: string) {
  const [year, month] = isoMonth.split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return date.toLocaleDateString("es-CO", { month: "short", year: "numeric" });
}

export function ScenarioProjectionChart({
  projection,
  currency = "COP",
  title = "Proyección del escenario",
}: ScenarioProjectionChartProps) {
  const data = projection.map((p) => ({
    month: monthLabel(p.month),
    escenario: p.balance,
    base: p.baseline,
  }));

  const breakEvenIndex = projection.findIndex((p) => p.balance < 0);
  const breakEvenLabel =
    breakEvenIndex >= 0 ? `Quiebre: ${monthLabel(projection[breakEvenIndex].month)}` : undefined;

  return (
    <Card className="surface-elevated-2 rounded-xl border-border">
      <CardHeader className="pb-3">
        <CardTitle className="heading-card text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="h-[300px] w-full sm:h-[400px]"
          role="img"
          aria-label="Gráfico de proyección del escenario versus la línea base"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorScenario" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--muted-foreground)"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--muted-foreground)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                opacity={0.5}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value), currency)}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  color: "var(--card-foreground)",
                }}
              />
              <Legend />
              <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
              {breakEvenLabel && (
                <ReferenceLine
                  x={data[breakEvenIndex]?.month}
                  stroke="var(--rose-500, #f43f5e)"
                  strokeDasharray="4 4"
                  label={{
                    value: breakEvenLabel,
                    position: "insideTopLeft",
                    fill: "var(--rose-500, #f43f5e)",
                    fontSize: 12,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="base"
                name="Línea base"
                stroke="var(--muted-foreground)"
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorBase)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="escenario"
                name="Escenario"
                stroke="var(--primary)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorScenario)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
