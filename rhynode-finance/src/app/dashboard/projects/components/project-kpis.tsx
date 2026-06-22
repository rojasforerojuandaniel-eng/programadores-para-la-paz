import { Card, CardContent } from "@/components/ui/card";
import { decimalToNumber } from "@/lib/decimal";
import { cn } from "@/lib/utils";
import { FolderKanban, Wallet, TrendingUp, CheckCircle2 } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale, type Locale } from "@/lib/locale-server";
import { formatCurrency } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

interface ProjectKpisProps {
  projects: Array<{
    status: string;
    budget: Prisma.Decimal | null;
    invoices: Array<{ total: Prisma.Decimal | null }>;
  }>;
}

export async function ProjectKpis({ projects }: ProjectKpisProps) {
  const locale: Locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.projects" });

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
  const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;
  const totalBudget = projects.reduce((sum, p) => sum + decimalToNumber(p.budget), 0);
  const totalSpent = projects.reduce(
    (sum, p) => sum + p.invoices.reduce((isum, inv) => isum + decimalToNumber(inv.total), 0),
    0
  );
  const utilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const completedPct =
    totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

  const kpis = [
    {
      icon: FolderKanban,
      label: t("kpis.projects.label"),
      value: totalProjects.toString(),
      sub: t("kpis.projects.sub", { active: activeProjects, completed: completedProjects }),
      tone: "text-primary",
    },
    {
      icon: Wallet,
      label: t("kpis.budget.label"),
      value: formatCurrency(totalBudget, "COP", locale),
      sub: t("kpis.budget.sub"),
      tone: "text-emerald-500",
    },
    {
      icon: TrendingUp,
      label: t("kpis.spent.label"),
      value: formatCurrency(totalSpent, "COP", locale),
      sub: t("kpis.spent.sub", { percent: utilization }),
      tone: utilization > 100 ? "text-destructive" : "text-amber-500",
    },
    {
      icon: CheckCircle2,
      label: t("kpis.completed.label"),
      value: completedProjects.toString(),
      sub: totalProjects > 0 ? t("kpis.completed.sub", { percent: completedPct }) : "—",
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