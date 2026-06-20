import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getLocale } from "@/lib/locale-server";
import { formatCurrency } from "@/lib/format";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { CreateRecurringDialog } from "./create-dialog";
import { RecurringList } from "./recurring-list";
import type { RecurringItem } from "./recurring-utils";
import { Repeat, Calendar, Wallet, Activity } from "lucide-react";

export default async function RecurringPage() {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.recurring" });

  const profile = await getUserProfile();
  if (!profile) return null;

  const prisma = getPrisma();
  const recurring = await prisma.recurringTransaction.findMany({
    where: { userId: profile.id },
    include: { category: true, account: true },
    orderBy: { nextDueDate: "asc" },
  });

  const items: RecurringItem[] = recurring.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    amount: decimalToNumber(r.amount),
    type: r.type,
    frequency: r.frequency,
    nextDueDate: r.nextDueDate.toISOString(),
    isSubscription: r.isSubscription,
    provider: r.provider,
    status: r.status,
    accountCurrency: r.account?.currency || null,
  }));

  const totalMonthly = recurring
    .filter((r) => r.status === "ACTIVE")
    .reduce((s, r) => s + decimalToNumber(r.amount), 0);
  const activeCount = recurring.filter((r) => r.status === "ACTIVE").length;
  const now = new Date().getTime();
  const nextSevenDays = recurring.filter(
    (r) =>
      r.status === "ACTIVE" &&
      r.nextDueDate &&
      new Date(r.nextDueDate).getTime() - now <= 7 * 24 * 60 * 60 * 1000,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">{t("subtitle")}</p>
        </div>
        <CreateRecurringDialog />
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label={t("monthly")} value={formatCurrency(totalMonthly, "COP", locale)} icon={Wallet} />
          <KpiCard label={t("active")} value={activeCount} icon={Activity} />
          <KpiCard
            label={t("next7")}
            value={nextSevenDays}
            icon={Calendar}
            valueClassName={nextSevenDays > 0 ? "text-amber-500" : "text-foreground"}
          />
        </div>
      )}

      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <RecurringList
          key={items.map((item) => item.id).join("-")}
          items={items}
          emptyState={
            <EmptyStateCard
              variant="lg"
              icon={Repeat}
              title={t("empty.title")}
              description={t("empty.description")}
              hint={t("empty.hint")}
              action={<CreateRecurringDialog />}
            />
          }
        />
      </Suspense>
    </div>
  );
}