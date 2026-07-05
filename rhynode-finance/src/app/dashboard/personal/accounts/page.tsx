import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { dashboardMetadataLocale } from "@/lib/dashboard-metadata";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { ServerDataTable } from "@/components/dashboard/server-data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { TableCell } from "@/components/ui/table";
import { CreateAccountDialog } from "./create-dialog";
import { Wallet, Landmark } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale } from "@/lib/locale-server";
import { formatCurrency } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "dashboard.personalAccounts" });
  return dashboardMetadataLocale(locale, t("title"), t("subtitle"));
}

function EmptyState({ t }: { t: (key: string) => string }) {
  return (
    <EmptyStateCard
      variant="lg"
      icon={Wallet}
      title={t("empty.title")}
      description={t("empty.description")}
      hint={t("empty.hint")}
      action={<CreateAccountDialog />}
    />
  );
}

export default async function AccountsPage() {
  const profile = await getUserProfile();
  if (!profile) return null;

  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.personalAccounts" });

  const prisma = getPrisma();
  const accounts = await prisma.account.findMany({
    where: { userId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  const totalBalance = accounts.reduce((s, a) => s + decimalToNumber(a.balance), 0);

  const columns = [
    { key: "name", header: t("columns.name") },
    { key: "type", header: t("columns.type") },
    { key: "balance", header: t("columns.balance") },
    { key: "currency", header: t("columns.currency") },
    { key: "color", header: t("columns.color") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">{t("subtitle")}</p>
        </div>
        <CreateAccountDialog />
      </div>

      {accounts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiCard
            label={t("kpis.totalBalance")}
            value={formatCurrency(totalBalance, "COP", locale)}
            icon={Landmark}
          />
          <KpiCard label={t("kpis.accounts")} value={accounts.length} icon={Wallet} />
        </div>
      )}

      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <ServerDataTable
          columns={columns}
          data={accounts}
          emptyState={<EmptyState t={t} />}
          renderRow={(account) => (
            <>
              <TableCell className="py-3 font-medium">{account.name}</TableCell>
              <TableCell className="py-3">
                <Badge variant="outline">{account.type}</Badge>
              </TableCell>
              <TableCell className="py-3 font-medium">
                {formatCurrency(decimalToNumber(account.balance), account.currency, locale)}
              </TableCell>
              <TableCell className="py-3 text-muted-foreground">{account.currency}</TableCell>
              <TableCell className="py-3">
                {account.color ? (
                  <span
                    className="inline-block h-4 w-4 rounded-full"
                    style={{ backgroundColor: account.color }}
                  />
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </>
          )}
          renderCard={(account) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {account.color ? (
                    <span
                      className="inline-block h-4 w-4 rounded-full"
                      style={{ backgroundColor: account.color }}
                    />
                  ) : (
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[9px] text-muted-foreground">-</span>
                  )}
                  <span className="font-medium">{account.name}</span>
                </div>
                <Badge variant="outline">{account.type}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-muted-foreground">{t("card.balance")}</div>
                <div className="text-right font-semibold">
                  {formatCurrency(decimalToNumber(account.balance), account.currency, locale)}
                </div>
                <div className="text-muted-foreground">{t("card.currency")}</div>
                <div className="text-right text-muted-foreground">{account.currency}</div>
              </div>
            </div>
          )}
        />
      </Suspense>
    </div>
  );
}