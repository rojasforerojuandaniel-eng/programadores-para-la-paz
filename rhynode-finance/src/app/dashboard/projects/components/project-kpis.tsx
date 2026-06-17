import { Card, CardContent } from "@/components/ui/card";
import { decimalToNumber } from "@/lib/decimal";
import { cn } from "@/lib/utils";
import { FolderKanban, Wallet, TrendingUp, CheckCircle2 } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";

interface ProjectKpisProps {
  projects: Array<{
    status: string;
    budget: Prisma.Decimal | null;
    invoices: Array<{ total: Prisma.Decimal | null }>;
  }>;
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ProjectKpis({ projects }: ProjectKpisProps) {
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
  const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;
  const totalBudget = projects.reduce((sum, p) => sum + decimalToNumber(p.budget), 0);
  const totalSpent = projects.reduce(
    (sum, p) => sum + p.invoices.reduce((isum, inv) => isum + decimalToNumber(inv.total), 0),
    0
  );
  const utilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const kpis = [
    {
      icon: FolderKanban,
      label: "Proyectos",
      value: totalProjects.toString(),
      sub: `${activeProjects} activos · ${completedProjects} completados`,
      tone: "text-primary",
    },
    {
      icon: Wallet,
      label: "Presupuesto total",
      value: formatCOP(totalBudget),
      sub: "COP",
      tone: "text-emerald-500",
    },
    {
      icon: TrendingUp,
      label: "Gastado",
      value: formatCOP(totalSpent),
      sub: `${utilization}% usado`,
      tone: utilization > 100 ? "text-destructive" : "text-amber-500",
    },
    {
      icon: CheckCircle2,
      label: "Completados",
      value: completedProjects.toString(),
      sub: totalProjects > 0 ? `${Math.round((completedProjects / totalProjects) * 100)}% del total` : "—",
      tone: "text-blue-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="surface-elevated-2">
          <CardContent className="flex flex-col p-4">
            <div className="flex items-center gap-2">
              <kpi.icon className={cn("h-4 w-4", kpi.tone)} aria-hidden="true" />
              <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
            </div>
            <div className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">{kpi.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{kpi.sub}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
