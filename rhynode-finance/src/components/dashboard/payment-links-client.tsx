"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableCell } from "@/components/ui/table";
import { CreatePaymentLinkDialog } from "@/components/dashboard/create-payment-link-dialog";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { DataTable } from "@/components/dashboard/data-table";
import {
  PaymentLinkActions,
  CopyLinkButton,
  QrDialog,
  getPublicUrl,
  type PaymentLink,
} from "@/components/dashboard/payment-link-actions";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  Link2,
  CheckCircle2,
  AlertCircle,
  DollarSign,
} from "lucide-react";

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "Activo",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  },
  INACTIVE: {
    label: "Inactivo",
    className: "border-gray-500/20 bg-gray-500/10 text-gray-400",
  },
  EXPIRED: {
    label: "Expirado",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  },
  EXHAUSTED: {
    label: "Agotado",
    className: "border-red-500/20 bg-red-500/10 text-red-400",
  },
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null): string {
  if (!value) return "Nunca";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatUses(link: PaymentLink): string {
  if (link.maxPayments) return `${link.currentPayments} / ${link.maxPayments}`;
  return `${link.currentPayments} · sin límite`;
}

function getEffectiveStatus(link: PaymentLink): string {
  if (link.maxPayments && link.currentPayments >= link.maxPayments) {
    return "EXHAUSTED";
  }
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return "EXPIRED";
  }
  return link.status;
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.ACTIVE;
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", config.className)}
    >
      {config.label}
    </Badge>
  );
}

interface PaymentLinksClientProps {
  initialLinks: PaymentLink[];
  canEdit: boolean;
}

export function PaymentLinksClient({
  initialLinks,
  canEdit,
}: PaymentLinksClientProps) {
  const router = useRouter();
  const refresh = () => router.refresh();

  const kpis = useMemo(() => {
    const active = initialLinks.filter((link) => link.status === "ACTIVE");
    const activeAmount = active.reduce((sum, link) => sum + link.amount, 0);
    const totalPayments = initialLinks.reduce(
      (sum, link) => sum + link.currentPayments,
      0
    );
    const inactive = initialLinks.length - active.length;
    return { activeCount: active.length, activeAmount, totalPayments, inactive };
  }, [initialLinks]);

  const columns = [
    { key: "name", header: "Nombre" },
    { key: "amount", header: "Monto" },
    { key: "status", header: "Estado" },
    { key: "uses", header: "Usos" },
    { key: "expires", header: "Expiración" },
    { key: "actions", header: "Acciones", className: "text-right" },
  ];

  function renderRow(link: PaymentLink) {
    const effectiveStatus = getEffectiveStatus(link);
    return (
      <>
        <TableCell className="font-medium">{link.name}</TableCell>
        <TableCell>{formatCurrency(link.amount, link.currency)}</TableCell>
        <TableCell>
          <StatusBadge status={effectiveStatus} />
        </TableCell>
        <TableCell className="text-sm">{formatUses(link)}</TableCell>
        <TableCell className="text-sm">{formatDate(link.expiresAt)}</TableCell>
        <TableCell className="text-right">
          <PaymentLinkActions
            link={link}
            onRefresh={refresh}
            canEdit={canEdit}
          />
        </TableCell>
      </>
    );
  }

  function renderCard(link: PaymentLink) {
    const effectiveStatus = getEffectiveStatus(link);
    const publicUrl = getPublicUrl(link);
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-medium">{link.name}</div>
            <div className="text-lg font-semibold">
              {formatCurrency(link.amount, link.currency)}
            </div>
          </div>
          <StatusBadge status={effectiveStatus} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Usos</span>
            <div className="font-medium">{formatUses(link)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Expira</span>
            <div className="font-medium">{formatDate(link.expiresAt)}</div>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <CopyLinkButton url={publicUrl} />
          <QrDialog url={publicUrl} name={link.name} />
          <PaymentLinkActions
            link={link}
            onRefresh={refresh}
            canEdit={canEdit}
            className="ml-auto"
          />
        </div>
      </div>
    );
  }

  const emptyState = (
    <EmptyStateCard
      variant="lg"
      icon={CreditCard}
      title="Cobra en línea en minutos"
      description="Crea links de pago únicos y compártelos por WhatsApp, email o redes sociales. Tus clientes pagan con Wompi, PayU, PSE o Stripe."
      hint="Empieza creando tu primer link de cobro."
      action={<CreatePaymentLinkDialog onCreate={refresh} />}
    />
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="heading-section">Links de Cobro</h1>
          <p className="body-default mt-1">
            Crea links de pago para compartir con clientes
          </p>
        </div>
        <CreatePaymentLinkDialog onCreate={refresh} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <KpiCard label="Links activos" value={kpis.activeCount} icon={Link2} />
        <KpiCard
          label="Monto activo"
          value={formatCurrency(kpis.activeAmount, "COP")}
          icon={DollarSign}
        />
        <KpiCard
          label="Pagos recibidos"
          value={kpis.totalPayments}
          icon={CheckCircle2}
        />
        <KpiCard label="Inactivos" value={kpis.inactive} icon={AlertCircle} />
      </div>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card">Links Activos</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={initialLinks}
            renderRow={renderRow}
            renderCard={renderCard}
            loading={false}
            emptyState={emptyState}
          />
        </CardContent>
      </Card>
    </div>
  );
}
