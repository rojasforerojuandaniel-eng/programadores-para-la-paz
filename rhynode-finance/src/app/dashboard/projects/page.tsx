import { decimalToNumber } from "@/lib/decimal";
import { redirect } from "next/navigation";
import { getOrCreateAuthOrg } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
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
import { Folder } from "lucide-react";

interface ProjectWithInvoices {
  id: string;
  name: string;
  description: string | null;
  status: string;
  budget: Prisma.Decimal | null;
  startDate: Date | null;
  endDate: Date | null;
  color: string | null;
  invoices: Array<{ id: string }>;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Activo", className: "bg-emerald-500/10 text-emerald-400" },
  COMPLETED: { label: "Completado", className: "bg-blue-500/10 text-blue-400" },
  ARCHIVED: { label: "Archivado", className: "bg-gray-500/10 text-gray-400" },
};

function formatCOP(amount: number | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-CO");
}

export default async function ProjectsPage() {
  const org = await getOrCreateAuthOrg();
  if (!org) redirect("/sign-in");

  const projects = await prisma.project.findMany({
    where: { organizationId: org.id },
    include: { invoices: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-section">Proyectos</h1>
          <p className="body-default mt-1">
            Gestiona tus proyectos y sus facturas asociadas
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card">Todos los Proyectos</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <EmptyStateCard
              variant="lg"
              icon={Folder}
              title="Organiza tu trabajo en proyectos"
              description="Crea proyectos y asócialos a facturas para un seguimiento claro de ingresos."
              hint="Empieza creando tu primer proyecto."
              action={<CreateProjectDialog />}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Presupuesto</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead className="text-right">Facturas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project: ProjectWithInvoices) => {
                  const status = statusConfig[project.status] || statusConfig.ACTIVE;
                  return (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {project.color && (
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{ backgroundColor: project.color }}
                            />
                          )}
                          <div>
                            <div className="font-medium">{project.name}</div>
                            {project.description && (
                              <div className="text-xs text-muted-foreground">
                                {project.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={status.className}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCOP(decimalToNumber(project.budget))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(project.startDate)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(project.endDate)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {project.invoices.length}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
