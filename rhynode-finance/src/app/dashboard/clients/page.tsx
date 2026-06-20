import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getLocale, type Locale } from "@/lib/locale-server";
import { formatCurrency } from "@/lib/format";
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

function formatCOP(amount: number | null | undefined, locale: Locale) {
  if (amount == null) return "—";
  return formatCurrency(amount, "COP", locale, { maximumFractionDigits: 0 });
}

export default async function ClientsPage() {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.clients" });

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">{t("subtitle")}</p>
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
        <KpiSection locale={locale} />
      </Suspense>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card">{t("allTitle")}</CardTitle>
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
          <ClientsContent locale={locale} />
        </Suspense>
      </Card>
    </div>
  );
}

async function KpiSection({ locale }: { locale: Locale }) {
  const org = await requireAuth();
  if (!org) return null;
  setRequestLocale(locale);

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
    0,
  );

  const t = await getTranslations({ locale, namespace: "dashboard.clients" });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      <KpiCard label={t("totalClients")} value={totalClients} icon={Users} />
      <KpiCard label={t("active")} value={activeClients} icon={UserCheck} />
      <KpiCard
        label={t("totalInvoiced")}
        value={formatCOP(totalInvoiced, locale)}
        icon={DollarSign}
      />
    </div>
  );
}

async function ClientsContent({ locale }: { locale: Locale }) {
  const org = await requireAuth();
  if (!org) return notFound();
  setRequestLocale(locale);

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
      0,
    ),
  }));

  const t = await getTranslations({ locale, namespace: "dashboard.clients" });

  return (
    <CardContent>
      {rows.length === 0 ? (
        <EmptyStateCard
          variant="lg"
          icon={Users}
          title={t("empty.title")}
          description={t("empty.description")}
          hint={t("empty.hint")}
          action={<CreateClientButton />}
        />
      ) : (
        <ClientList
          rows={rows}
          countryLabels={countryLabels}
          formatCOP={(amount) => formatCOP(amount, locale)}
        />
      )}
    </CardContent>
  );
}