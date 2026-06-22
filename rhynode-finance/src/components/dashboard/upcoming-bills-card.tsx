import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUpcomingBills, formatDueLabel, type BillKind } from "@/lib/upcoming-bills";
import { CreditCard, Receipt, FileText, Landmark, CalendarClock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale } from "@/lib/locale-server";
import { formatCurrency } from "@/lib/format";

const KIND_META: Record<BillKind, { labelKey: string; Icon: typeof CreditCard }> = {
  debt: { labelKey: "upcomingEvents.types.debt", Icon: Landmark },
  subscription: { labelKey: "upcomingBills.types.subscription", Icon: CreditCard },
  invoice: { labelKey: "upcomingEvents.types.invoice", Icon: Receipt },
  tax: { labelKey: "upcomingEvents.types.tax", Icon: FileText },
};

export async function UpcomingBillsCard({
  userId,
  orgId,
}: {
  userId: string;
  orgId: string | null;
}) {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.home" });

  const bills = await getUpcomingBills(userId, orgId, 60, locale, t);
  const total = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const overdueCount = bills.filter((bill) => bill.overdue).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" aria-hidden="true" />
          {t("upcomingBills.title")}
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {bills.length > 0
            ? t("upcomingBills.countIn60", { count: bills.length })
            : t("upcomingBills.noPending")}
        </span>
      </CardHeader>
      <CardContent className="space-y-1">
        {bills.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("upcomingBills.empty")}
          </p>
        ) : (
          <>
            {overdueCount > 0 && (
              <div className="mb-2 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {t("upcomingBills.overdue", {
                    count: overdueCount,
                    amount: formatCurrency(
                      bills.filter((b) => b.overdue).reduce((s, b) => s + b.amount, 0),
                      "COP",
                      locale
                    ),
                  })}
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
                            {t(meta.labelKey as never)}
                            {bill.subtitle ? ` · ${bill.subtitle}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(bill.amount, bill.currency, locale)}
                        </span>
                        <span
                          className={`text-xs tabular-nums ${
                            bill.overdue ? "text-destructive font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {formatDueLabel(bill.daysUntilDue, locale, t)}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {bills.length > 6 && (
              <p className="pt-2 text-center text-xs text-muted-foreground">
                {t("upcomingBills.more", {
                  count: bills.length - 6,
                  total: formatCurrency(total, "COP", locale),
                })}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}