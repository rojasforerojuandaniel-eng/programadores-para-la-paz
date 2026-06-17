import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { dashboardMetadata } from "@/lib/dashboard-metadata";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateClientButton } from "@/components/dashboard/create-client-button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { ClientList, type ClientRow } from "@/components/dashboard/client-list";
import { Loader2, Users, UserCheck, DollarSign } from "lucide-react";

export const metadata = dashboardMetadata(
  "Clientes",
  "Gestiona tus clientes, su historial de facturas y datos fiscales para facturación DIAN."
);

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

  const rows: ClientRow[] = clients.map((client) => ({
    id: client.id,
    name: client.name,
    taxId: client.taxId ?? undefined,
    email: client.email ?? undefined,
    phone: client.phone ?? undefined,
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
          variant="lg"
          icon={Users}
          title="Gestiona tus clientes"
          description="Agrega datos fiscales y de contacto para facturar de forma organizada."
          hint="Empieza agregando tu primer cliente."
          action={<CreateClientButton />}
        />
      ) : (
        <ClientList
          rows={rows}
          countryLabels={countryLabels}
          formatCOP={formatCOP}
        />
      )}
    </CardContent>
  );
}
