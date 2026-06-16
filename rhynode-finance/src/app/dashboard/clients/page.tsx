import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { dashboardMetadata } from "@/lib/dashboard-metadata";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateClientButton } from "@/components/dashboard/create-client-button";
import { DeleteButton } from "@/components/dashboard/delete-button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Users, UserCheck, DollarSign } from "lucide-react";

export const metadata = dashboardMetadata(
  "Clientes",
  "Gestiona tus clientes, su historial de facturas y datos fiscales para facturación DIAN."
);

interface ClientInvoiceSummary {
  id: string;
  name: string;
  taxId?: string;
  email?: string;
  city?: string;
  country?: string;
  status: string;
  invoiceCount: number;
  invoiceTotal: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Activo", className: "bg-emerald-500/10 text-emerald-400" },
  INACTIVE: { label: "Inactivo", className: "bg-gray-500/10 text-gray-400" },
  ARCHIVED: { label: "Archivado", className: "bg-gray-500/10 text-gray-400" },
};

const countryLabels: Record<string, string> = {
  CO: "Colombia",
  MX: "México",
  BR: "Brasil",
  AR: "Argentina",
  CL: "Chile",
  PE: "Perú",
};

function formatCOP(amount: number | null | undefined) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ClientsPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-section">Clientes</h1>
          <p className="body-default mt-1">Directorio de clientes y sus datos fiscales</p>
        </div>
        <CreateClientButton />
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        }
      >
        <KpiSection />
      </Suspense>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card">Todos los Clientes</CardTitle>
        </CardHeader>
        <Suspense
          fallback={
            <CardContent>
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            </CardContent>
          }
        >
          <ClientsContent />
        </Suspense>
      </Card>
    </div>
  );
}

async function KpiSection() {
  const org = await requireAuth();
  if (!org) return null;

  const prisma = getPrisma();
  const clients = await prisma.client.findMany({
    where: { organizationId: org.id },
    include: { invoices: { select: { total: true } } },
  });

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "ACTIVE").length;
  const totalInvoiced = clients.reduce(
    (sum, c) =>
      sum + c.invoices.reduce((s, inv) => s + decimalToNumber(inv.total), 0),
    0
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      <KpiCard label="Total clientes" value={totalClients} icon={Users} />
      <KpiCard label="Activos" value={activeClients} icon={UserCheck} />
      <KpiCard
        label="Total facturado"
        value={formatCOP(totalInvoiced)}
        icon={DollarSign}
      />
    </div>
  );
}

async function ClientsContent() {
  const org = await requireAuth();
  if (!org) return notFound();

  const prisma = getPrisma();
  const clients = await prisma.client.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    include: { invoices: { select: { total: true } } },
  });

  const rows: ClientInvoiceSummary[] = clients.map((client) => ({
    id: client.id,
    name: client.name,
    taxId: client.taxId ?? undefined,
    email: client.email ?? undefined,
    city: client.city ?? undefined,
    country: client.country ?? undefined,
    status: client.status,
    invoiceCount: client.invoices.length,
    invoiceTotal: client.invoices.reduce(
      (sum, invoice) => sum + decimalToNumber(invoice.total),
      0
    ),
  }));

  return (
    <CardContent>
      {rows.length === 0 ? (
        <EmptyStateCard
          icon={Users}
          title="Gestiona tus clientes"
          description="Agrega datos fiscales y de contacto para facturar de forma organizada."
          hint="Empieza agregando tu primer cliente."
          action={<CreateClientButton />}
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nombre</TableHead>
                  <TableHead>NIT / RFC / CNPJ</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>País</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Facturas</TableHead>
                  <TableHead className="text-right">Total facturado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((client) => {
                  const status = statusConfig[client.status] || statusConfig.ACTIVE;
                  return (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="font-mono text-sm">{client.taxId || "—"}</TableCell>
                      <TableCell className="text-sm">{client.email || "—"}</TableCell>
                      <TableCell className="text-sm">{client.city || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {countryLabels[client.country || ""] || client.country || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={status.className}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{client.invoiceCount}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCOP(client.invoiceTotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DeleteButton
                          endpoint={`/api/clients/${client.id}`}
                          confirmMessage="¿Eliminar este cliente permanentemente?"
                          title="Eliminar cliente"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="grid grid-cols-1 gap-4 md:hidden" role="list">
            {rows.map((client) => {
              const status = statusConfig[client.status] || statusConfig.ACTIVE;
              return (
                <li key={client.id} className="surface-elevated-2 rounded-xl p-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{client.name}</div>
                        <div className="font-mono text-sm text-muted-foreground">
                          {client.taxId || "—"}
                        </div>
                      </div>
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground">Email</div>
                        <div className="truncate">{client.email || "—"}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Ubicación</div>
                        <div className="truncate">
                          {[client.city, countryLabels[client.country || ""] || client.country]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <div className="text-sm">
                        <span className="text-muted-foreground">{client.invoiceCount} facturas · </span>{" "}
                        <span className="font-medium">{formatCOP(client.invoiceTotal)}</span>
                      </div>
                      <DeleteButton
                        endpoint={`/api/clients/${client.id}`}
                        confirmMessage="¿Eliminar este cliente permanentemente?"
                        title="Eliminar cliente"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </CardContent>
  );
}
