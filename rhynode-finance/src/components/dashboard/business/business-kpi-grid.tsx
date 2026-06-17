import { decimalToNumber } from "@/lib/decimal";
import { getPrisma } from "@/lib/prisma";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { FileText, TrendingUp, Users, Link2 } from "lucide-react";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getMonthRange() {
  const now = new Date();
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)),
    end: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    ),
  };
}

interface BusinessKpiGridProps {
  orgId: string;
  currency: string;
}

export async function BusinessKpiGrid({
  orgId,
  currency,
}: BusinessKpiGridProps) {
  const prisma = getPrisma();
  const { start, end } = getMonthRange();

  const [pendingInvoices, monthRevenueAgg, activeClients, paymentLinks] =
    await Promise.all([
      prisma.invoice.count({
        where: {
          organizationId: orgId,
          status: { in: ["SENT", "OVERDUE", "PARTIAL"] },
        },
      }),
      prisma.invoice.aggregate({
        where: {
          organizationId: orgId,
          status: "PAID",
          issueDate: { gte: start, lte: end },
        },
        _sum: { total: true },
      }),
      prisma.client.count({
        where: { organizationId: orgId, status: "ACTIVE" },
      }),
      prisma.paymentLink.count({
        where: { organizationId: orgId },
      }),
    ]);

  const monthRevenue = decimalToNumber(monthRevenueAgg._sum.total);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Facturas Pendientes"
        value={pendingInvoices.toString()}
        icon={FileText}
      />
      <KpiCard
        label="Ingresos del Mes"
        value={formatCurrency(monthRevenue, currency)}
        icon={TrendingUp}
      />
      <KpiCard
        label="Clientes Activos"
        value={activeClients.toString()}
        icon={Users}
      />
      <KpiCard
        label="Links de Pago Creados"
        value={paymentLinks.toString()}
        icon={Link2}
      />
    </div>
  );
}
