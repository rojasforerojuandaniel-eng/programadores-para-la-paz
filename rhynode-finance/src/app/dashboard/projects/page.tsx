import { decimalToNumber } from "@/lib/decimal";
import { redirect } from "next/navigation";
import { getOrCreateAuthOrg } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale, type Locale } from "@/lib/locale-server";
import { formatCurrency, formatDate as fmtDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateProjectDialog } from "./create-dialog";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FolderKanban, CalendarDays, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectCard } from "./components/project-card";
import { ProjectProgress } from "./components/project-progress";
import { ProjectActions } from "./components/project-actions";
import { ProjectKpis } from "./components/project-kpis";

export interface ProjectWithInvoices {
  id: string;
  name: string;
  description: string | null;
  status: string;
  budget: Prisma.Decimal | null;
  startDate: Date | null;
  endDate: Date | null;
  color: string | null;
  invoices: Array<{ id: string; total: Prisma.Decimal | null }>;
}

const statusConfig: Record<string, { labelKey: string; className: string }> = {
  ACTIVE: {
    labelKey: "statuses.ACTIVE",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  COMPLETED: {
    labelKey: "statuses.COMPLETED",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  ARCHIVED: {
    labelKey: "statuses.ARCHIVED",
    className: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  },
};

function formatCOP(amount: number | null, locale: Locale) {
  if (amount == null) return "—";
  return formatCurrency(amount, "COP", locale);
}

function formatDate(date: Date | null, locale: Locale) {
  if (!date) return "—";
  return fmtDate(date, locale);
}

function projectSpent(project: ProjectWithInvoices): number {
  return project.invoices.reduce(
    (sum, invoice) => sum + decimalToNumber(invoice.total),
    0
  );
}

export default async function ProjectsPage() {
  const org = await getOrCreateAuthOrg();
  if (!org) redirect("/sign-in");

  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.projects" });

  const projects = await prisma.project.findMany({
    where: { organizationId: org.id },
    include: { invoices: { select: { id: true, total: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">{t("subtitle")}</p>
        </div>
        <CreateProjectDialog />
      </div>

      {projects.length > 0 && <ProjectKpis projects={projects} />}

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" aria-hidden="true" />
            {t("allTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {projects.length === 0 ? (
            <EmptyStateCard
              variant="lg"
              icon={FolderKanban}
              title={t("empty.title")}
              description={t("empty.description")}
              hint={t("empty.hint")}
              action={<CreateProjectDialog />}
            />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="grid gap-3 lg:hidden">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">{t("columns.project")}</TableHead>
                      <TableHead scope="col">{t("columns.status")}</TableHead>
                      <TableHead scope="col">{t("columns.budget")}</TableHead>
                      <TableHead scope="col">{t("columns.spent")}</TableHead>
                      <TableHead scope="col">{t("columns.progress")}</TableHead>
                      <TableHead scope="col">{t("columns.dates")}</TableHead>
                      <TableHead scope="col">{t("columns.invoices")}</TableHead>
                      <TableHead scope="col" className="text-right">{t("columns.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => {
                      const status = statusConfig[project.status] || statusConfig.ACTIVE;
                      const budget = decimalToNumber(project.budget);
                      const spent = projectSpent(project);

                      return (
                        <TableRow key={project.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <span
                                className="inline-block h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: project.color ?? "var(--primary)" }}
                                aria-hidden="true"
                              />
                              <div className="min-w-0">
                                <div className="font-medium">{project.name}</div>
                                {project.description && (
                                  <div className="max-w-[16rem] truncate text-xs text-muted-foreground sm:max-w-xs lg:max-w-md">
                                    {project.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-xs", status.className)}>
                              {t(status.labelKey as never)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCOP(budget, locale)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCOP(spent, locale)}
                          </TableCell>
                          <TableCell className="min-w-[8rem]">
                            <ProjectProgress spent={spent} budget={budget} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                              {formatDate(project.startDate, locale)} – {formatDate(project.endDate, locale)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              {project.invoices.length}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <ProjectActions projectName={project.name} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
