import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUpcomingBills, formatDueLabel, type BillKind } from "@/lib/upcoming-bills";
import { CreditCard, Receipt, FileText, Landmark, CalendarClock, AlertCircle } from "lucide-react";
import Link from "next/link";

const KIND_META: Record<BillKind, { label: string; Icon: typeof CreditCard }> = {
  debt: { label: "Deuda", Icon: Landmark },
  subscription: { label: "Suscripción", Icon: CreditCard },
  invoice: { label: "Factura", Icon: Receipt },
  tax: { label: "Impuesto", Icon: FileText },
};

function formatCop(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function UpcomingBillsCard({
  userId,
  orgId,
}: {
  userId: string;
  orgId: string | null;
}) {
  const bills = await getUpcomingBills(userId, orgId, 60);
  const total = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const overdueCount = bills.filter((bill) => bill.overdue).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" aria-hidden="true" />
          Próximos Pagos
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {bills.length > 0 ? `${bills.length} en 60 días` : "Sin pendientes"}
        </span>
      </CardHeader>
      <CardContent className="space-y-1">
        {bills.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No tienes pagos próximos en los próximos 60 días. 🎉
          </p>
        ) : (
          <>
            {overdueCount > 0 && (
              <div className="mb-2 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {overdueCount} vencido{overdueCount > 1 ? "s" : ""} — {formatCop(
                    bills.filter((b) => b.overdue).reduce((s, b) => s + b.amount, 0),
                    "COP"
                  )}
                </span>
              </div>
            )}
            <ul className="divide-y divide-border">
              {bills.slice(0, 6).map((bill) => {
                const meta = KIND_META[bill.kind];
                const Icon = meta.Icon;
                return (
                  <li key={`${bill.kind}-${bill.id}`}>
                    <Link
                      href={bill.href}
                      className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-muted/40 -mx-2 px-2 rounded-sm"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{bill.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {meta.label}
                            {bill.subtitle ? ` · ${bill.subtitle}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCop(bill.amount, bill.currency)}
                        </span>
                        <span
                          className={`text-xs tabular-nums ${
                            bill.overdue ? "text-destructive font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {formatDueLabel(bill.daysUntilDue)}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {bills.length > 6 && (
              <p className="pt-2 text-center text-xs text-muted-foreground">
                +{bills.length - 6} más · Total {formatCop(total, "COP")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}