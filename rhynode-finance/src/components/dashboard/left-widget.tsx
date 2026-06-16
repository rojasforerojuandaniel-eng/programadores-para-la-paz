import { decimalToNumber } from "@/lib/decimal";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import type { UserScope } from "@/lib/scope";
import type { TransactionWhereInput } from "@/generated/prisma/models/Transaction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeftRight,
  FileText,
  Plus,
  Receipt,
} from "lucide-react";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface LeftWidgetProps {
  scope: UserScope;
  orgId: string;
  userId: string | undefined;
  currency: string;
}

export async function LeftWidget({ scope, orgId, userId, currency }: LeftWidgetProps) {
  const prisma = getPrisma();

  if (scope === "PERSONAL") {
    const txnWhere: TransactionWhereInput = userId
      ? { organizationId: orgId, scope: "PERSONAL", OR: [{ userId }, { userId: null }] }
      : { organizationId: orgId, scope: "PERSONAL" };
    const transactions = await prisma.transaction.findMany({
      where: txnWhere,
      orderBy: { date: "desc" },
      take: 5,
      include: { categoryRef: true },
    });

    const empty = transactions.length === 0;

    return (
      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Últimas Transacciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {empty ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Receipt className="h-8 w-8 text-muted-foreground" />
              <p className="body-default text-muted-foreground">Sin transacciones</p>
              <Link
                href="/dashboard/transactions"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                <Plus className="h-4 w-4" />
                Crear primera transacción
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.description}</p>
                    <p className="body-small text-muted-foreground">
                      {t.categoryRef?.name || "Sin categoría"} —{" "}
                      {new Date(t.date).toLocaleDateString("es-CO")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold ${
                      t.type === "INCOME" ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {t.type === "INCOME" ? "+" : "-"}
                    {formatCurrency(decimalToNumber(t.amount), t.currency || currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (scope === "BUSINESS") {
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: orgId },
      select: { status: true },
    });

    const draft = invoices.filter((i) => i.status === "DRAFT").length;
    const sent = invoices.filter((i) => i.status === "SENT").length;
    const paid = invoices.filter((i) => i.status === "PAID").length;
    const overdue = invoices.filter((i) => i.status === "OVERDUE").length;
    const empty = invoices.length === 0;

    return (
      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Estado de Facturas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {empty ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="body-default text-muted-foreground">Sin facturas</p>
              <Link
                href="/dashboard/invoices"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                <Plus className="h-4 w-4" />
                Crear primera factura
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="body-default">Borradores</span>
                <Badge variant="outline">{draft}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="body-default">Enviadas</span>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400">
                  {sent}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="body-default">Pagadas</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400">
                  {paid}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="body-default">Vencidas</span>
                <Badge variant="outline" className="bg-red-500/10 text-red-400">
                  {overdue}
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // BOTH
  const [personalTxns, businessInvoices] = await Promise.all([
    prisma.transaction.findMany({
      where: { organizationId: orgId, scope: "PERSONAL" },
      orderBy: { date: "desc" },
      take: 3,
      include: { categoryRef: true },
    }),
    prisma.invoice.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { client: true },
    }),
  ]);

  const empty = personalTxns.length === 0 && businessInvoices.length === 0;

  return (
    <Card className="surface-elevated-2">
      <CardHeader>
        <CardTitle className="heading-card flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4" />
          Resumen Mixto
        </CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Receipt className="h-8 w-8 text-muted-foreground" />
            <p className="body-default text-muted-foreground">Sin actividad reciente</p>
            <Link
              href="/dashboard/transactions"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="h-4 w-4" />
              Crear primera transacción
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {personalTxns.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Personal
                </p>
                {personalTxns.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      <p className="body-small text-muted-foreground">
                        {t.categoryRef?.name || "Sin categoría"} —{" "}
                        {new Date(t.date).toLocaleDateString("es-CO")}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        t.type === "INCOME" ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {t.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(decimalToNumber(t.amount), t.currency || currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {businessInvoices.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Empresa
                </p>
                {businessInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {inv.client?.name || "Cliente"}
                      </p>
                      <p className="body-small text-muted-foreground">
                        Factura — {new Date(inv.createdAt).toLocaleDateString("es-CO")}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold">
                      {formatCurrency(decimalToNumber(inv.total), inv.currency || currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
