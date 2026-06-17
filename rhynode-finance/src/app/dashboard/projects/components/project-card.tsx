import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectProgress } from "./project-progress";
import { ProjectActions } from "./project-actions";
import { CalendarDays, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { decimalToNumber } from "@/lib/decimal";
import type { ProjectWithInvoices } from "../page";

interface ProjectCardProps {
  project: ProjectWithInvoices;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "Activo",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  COMPLETED: {
    label: "Completado",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  ARCHIVED: {
    label: "Archivado",
    className: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  },
};

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ProjectCard({ project }: ProjectCardProps) {
  const status = statusConfig[project.status] || statusConfig.ACTIVE;
  const budget = decimalToNumber(project.budget);
  const spent = project.invoices.reduce(
    (sum, inv) => sum + decimalToNumber(inv.total),
    0
  );

  return (
    <Card className="surface-elevated-2 overflow-hidden lg:hidden">
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: project.color ?? "var(--primary)" }}
        aria-hidden="true"
      />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-tight">{project.name}</h3>
            {project.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
          <ProjectActions projectName={project.name} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("text-xs", status.className)}>
            {status.label}
          </Badge>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            {project.invoices.length} facturas
          </span>
        </div>

        <div className="mt-4">
          <ProjectProgress spent={spent} budget={budget} />
        </div>

        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDate(project.startDate)} – {formatDate(project.endDate)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
