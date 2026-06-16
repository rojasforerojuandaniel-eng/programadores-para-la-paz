import { decimalToNumber } from "@/lib/decimal";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import type { UserScope } from "@/lib/scope";
import type { TransactionWhereInput } from "@/generated/prisma/models/Transaction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import {
  ArrowLeftRight,
  Plus,
  Receipt,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface RightWidgetProps {
  scope: UserScope;
  orgId: string;
  userId: string | undefined;
  currency: string;
}

export async function RightWidget({ scope, orgId, userId, currency }: RightWidgetProps) {
  const prisma = getPrisma();

  if (scope === "PERSONAL") {
    const budgets = userId
      ? await prisma.budget.findMany({
          where: { userId },
          include: { category: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : [];

    const empty = budgets.length === 0;

    return (
      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Presupuestos del Mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {empty ? (
            <EmptyStateCard
              variant="sm"
              className="border-0 bg-transparent shadow-none"
              icon={TrendingUp}
              title="Sin presupuestos"
              description="Establece límites por categoría y recibe alertas antes de excederte."
              hint="Empieza creando tu primer presupuesto."
              action={
                <Link href="/dashboard/personal/budgets">
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    Crear primer presupuesto
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-4">
              {budgets.map((b) => {
                const pct = decimalToNumber(b.amount) > 0 ? Math.min((decimalToNumber(b.spent) / decimalToNumber(b.amount)) * 100, 100) : 0;
                return (
                  <div key={b.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {b.category?.name || b.name}
                      </span>
                      <span className="body-small text-muted-foreground">
                        {formatCurrency(decimalToNumber(b.spent), currency)} / {formatCurrency(decimalToNumber(b.amount), currency)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (scope === "BUSINESS") {
    const taxes = await prisma.taxReport.findMany({
      where: { organizationId: orgId, status: "PENDING" },
      orderBy: { dueDate: "asc" },
      take: 5,
    });

    const empty = taxes.length === 0;

    return (
      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Próximos Vencimientos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {empty ? (
            <EmptyStateCard
              variant="sm"
              className="border-0 bg-transparent shadow-none"
              icon={ShieldCheck}
              title="No hay vencimientos próximos"
              description="Crea reportes fiscales para mantener el compliance al día."
              hint="Empieza creando tu primer reporte fiscal."
              action={
                <Link href="/dashboard/tax">
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    Crear reporte fiscal
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {taxes.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <span className="text-sm">
                    {t.type} — {t.period} {t.year}
                    {t.month ? ` / ${t.month}` : ""}
                  </span>
                  <Badge variant="outline">
                    {t.dueDate
                      ? `Vence ${new Date(t.dueDate).toLocaleDateString("es-CO")}`
                      : "Pendiente"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // BOTH: Actividad Reciente (mezcla de transacciones y facturas)
  const txnWhere: TransactionWhereInput = userId
    ? { organizationId: orgId, scope: "PERSONAL", OR: [{ userId }, { userId: null }] }
    : { organizationId: orgId, scope: "PERSONAL" };
  const [transactions, invoices] = await Promise.all([
    prisma.transaction.findMany({
      where: txnWhere,
      orderBy: { date: "desc" },
      take: 5,
      include: { categoryRef: true },
    }),
    prisma.invoice.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: true },
    }),
  ]);

  const mixed = [
    ...transactions.map((t) => ({
      id: t.id,
      type: "transaction" as const,
      title: t.description,
      subtitle: t.categoryRef?.name || "Sin categoría",
      date: t.date,
      amount: t.amount,
      currency: t.currency || currency,
      income: t.type === "INCOME",
    })),
    ...invoices.map((i) => ({
      id: i.id,
      type: "invoice" as const,
      title: i.client?.name || "Cliente",
      subtitle: "Factura",
      date: i.createdAt,
      amount: i.total,
      currency: i.currency || currency,
      income: true,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

  const empty = mixed.length === 0;

  return (
    <Card className="surface-elevated-2">
      <CardHeader>
        <CardTitle className="heading-card flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4" />
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <EmptyStateCard
            variant="sm"
            className="border-0 bg-transparent shadow-none"
            icon={Receipt}
            title="Sin actividad reciente"
            description="Registra transacciones o facturas para ver tu actividad mixta aquí."
            hint="Empieza creando tu primera transacción."
            action={
              <Link href="/dashboard/transactions">
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Crear primera transacción
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {mixed.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="body-small text-muted-foreground">
                    {item.subtitle} — {new Date(item.date).toLocaleDateString("es-CO")}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold ${
                    item.income ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {item.income ? "+" : "-"}
                  {formatCurrency(decimalToNumber(item.amount), item.currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
