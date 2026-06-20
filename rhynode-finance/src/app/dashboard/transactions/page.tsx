import { decimalToNumber } from "@/lib/decimal";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getLocale, type Locale } from "@/lib/locale-server";
import { formatCurrency as formatCurrencyLocale } from "@/lib/format";
import type { UserScope } from "@/lib/scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { ExportButtons } from "@/components/dashboard/export-buttons";
import {
  TransactionsList,
  type Transaction,
} from "@/components/dashboard/transactions-list";
import {
  type TransactionFiltersState,
  type TransactionFilterOptions,
} from "@/components/dashboard/transactions-filters";
import { COMMON_CATEGORIES } from "@/lib/transaction-categories";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Plus,
  Upload,
} from "lucide-react";
import {
  KpiSkeleton,
  TableRowsSkeleton,
} from "@/components/dashboard/page-skeleton";

const CreateTransactionButton = dynamic(
  () =>
    import("@/components/dashboard/create-transaction-button").then(
      (mod) => mod.CreateTransactionButton,
    ),
  {
    loading: () => (
      <Button className="gap-2" disabled>
        <Plus className="h-4 w-4" />
        Nueva Transacción
      </Button>
    ),
  },
);

const BankImportRefreshButton = dynamic(
  () =>
    import("@/components/dashboard/bank-import-dialog").then(
      (mod) => mod.BankImportRefreshButton,
    ),
  {
    loading: () => (
      <Button variant="outline" className="gap-2" disabled>
        <Upload className="h-4 w-4" />
        Importar
      </Button>
    ),
  },
);

function scopeFilter(scope: UserScope) {
  if (scope === "PERSONAL") return { scope: "PERSONAL" };
  if (scope === "BUSINESS") return { scope: "BUSINESS" };
  return { scope: { in: ["PERSONAL", "BUSINESS"] } };
}

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function isValidISODate(value: string): boolean {
  if (!value) return true;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isValidAmount(value: string): boolean {
  if (!value) return true;
  return /^\d+(\.\d+)?$/.test(value) && !Number.isNaN(Number(value));
}

const filterSchema = z.object({
  q: z.string().max(200).default(""),
  from: z.string().max(20).default(""),
  to: z.string().max(20).default(""),
  type: z.enum(["all", "INCOME", "EXPENSE"]).default("all"),
  category: z.string().max(100).default(""),
  account: z.string().max(100).default(""),
  min: z.string().max(20).default(""),
  max: z.string().max(20).default(""),
});

function parseFilters(
  params: Record<string, string | string[] | undefined>,
): TransactionFiltersState {
  const raw = {
    q: getParam(params, "q"),
    from: getParam(params, "from"),
    to: getParam(params, "to"),
    type: getParam(params, "type"),
    category: getParam(params, "category"),
    account: getParam(params, "account"),
    min: getParam(params, "min"),
    max: getParam(params, "max"),
  };

  const parsed = filterSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      q: "",
      from: "",
      to: "",
      type: "all",
      category: "",
      account: "",
      min: "",
      max: "",
    };
  }

  const data = parsed.data;
  return {
    q: data.q,
    from: isValidISODate(data.from) ? data.from : "",
    to: isValidISODate(data.to) ? data.to : "",
    type: data.type,
    category: data.category,
    account: data.account,
    min: isValidAmount(data.min) ? data.min : "",
    max: isValidAmount(data.max) ? data.max : "",
  };
}

function buildWhere(
  filters: TransactionFiltersState,
  orgId: string,
  scope: UserScope,
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {
    organizationId: orgId,
    ...scopeFilter(scope),
  };

  if (filters.type !== "all") {
    where.type = filters.type;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.account) {
    where.bankAccountId = filters.account;
  }

  const query = filters.q.trim();
  if (query) {
    where.description = { contains: query, mode: "insensitive" };
  }

  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) {
      where.date.gte = new Date(filters.from);
    }
    if (filters.to) {
      const toEnd = new Date(filters.to);
      toEnd.setHours(23, 59, 59, 999);
      where.date.lte = toEnd;
    }
  }

  if (filters.min || filters.max) {
    where.amount = {};
    if (filters.min) {
      where.amount.gte = new Prisma.Decimal(filters.min);
    }
    if (filters.max) {
      where.amount.lte = new Prisma.Decimal(filters.max);
    }
  }

  return where;
}

interface TransactionsPageProps {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const resolvedParams =
    (await Promise.resolve(searchParams ?? {})) ??
    ({} as Record<string, string | string[] | undefined>);
  const filters = parseFilters(resolvedParams);
  const defaultOpen = getParam(resolvedParams, "new") === "1";

  const org = await requireAuth();
  const bankAccounts = org
    ? await getPrisma().bankAccount.findMany({
        where: { organizationId: org.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true, bankName: true },
      })
    : [];

  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.transactions" });

  return (
    <div className="space-y-5 sm:space-y-6">
      <Suspense
        fallback={<div className="h-16 animate-pulse rounded-xl bg-muted" />}
      >
        <HeaderSection defaultOpen={defaultOpen} bankAccounts={bankAccounts} locale={locale} />
      </Suspense>

      <Suspense fallback={<KpiSkeleton count={3} columns={3} />}>
        <KpiSection locale={locale} />
      </Suspense>

      <Card className="surface-elevated-2">
        <CardHeader>
          <CardTitle className="heading-card">
            {t("allTitle")}
          </CardTitle>
        </CardHeader>
        <Suspense
          fallback={
            <CardContent className="space-y-4">
              <TableRowsSkeleton rows={5} />
            </CardContent>
          }
        >
          <TransactionsContent filters={filters} bankAccounts={bankAccounts} />
        </Suspense>
      </Card>
    </div>
  );
}

async function HeaderSection({
  defaultOpen,
  bankAccounts,
  locale,
}: {
  defaultOpen?: boolean;
  bankAccounts: { id: string; name: string; bankName: string }[];
  locale: Locale;
}) {
  await requireAuth();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.transactions" });

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="heading-section">{t("title")}</h1>
        <p className="body-default mt-1">{t("subtitle")}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <ExportButtons />
        <BankImportRefreshButton bankAccounts={bankAccounts} />
        <CreateTransactionButton defaultOpen={defaultOpen} />
      </div>
    </div>
  );
}

async function KpiSection({
  locale,
}: {
  locale: Locale;
}) {
  const org = await requireAuth();
  if (!org) return null;
  setRequestLocale(locale);

  const profile = await getUserProfile();
  const scope = (profile?.scope ?? "PERSONAL") as UserScope;

  const prisma = getPrisma();
  const transactions = await prisma.transaction.findMany({
    where: { organizationId: org.id, ...scopeFilter(scope) },
  });

  const income = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + decimalToNumber(t.amount), 0);
  const expense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + decimalToNumber(t.amount), 0);
  const balance = income - expense;

  const t = await getTranslations({ locale, namespace: "dashboard.transactions" });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      <KpiCard
        label={t("income")}
        value={formatCurrencyLocale(income, org.currency, locale)}
        icon={TrendingUp}
        valueClassName="text-success"
      />
      <KpiCard
        label={t("expense")}
        value={formatCurrencyLocale(expense, org.currency, locale)}
        icon={TrendingDown}
        valueClassName="text-danger"
      />
      <KpiCard
        label={t("balance")}
        value={formatCurrencyLocale(balance, org.currency, locale)}
        icon={Scale}
        valueClassName={balance >= 0 ? "text-success" : "text-danger"}
      />
    </div>
  );
}

async function TransactionsContent({
  filters,
  bankAccounts,
}: {
  filters: TransactionFiltersState;
  bankAccounts: { id: string; name: string; bankName: string }[];
}) {
  const org = await requireAuth();
  if (!org) return notFound();

  const profile = await getUserProfile();
  const scope = (profile?.scope ?? "PERSONAL") as UserScope;

  const prisma = getPrisma();
  const where = buildWhere(filters, org.id, scope);

  const [transactions, categoryGroups] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        bankAccount: { select: { name: true } },
      },
    }),
    prisma.transaction.groupBy({
      by: ["category"],
      where: {
        organizationId: org.id,
        ...scopeFilter(scope),
        category: { not: null },
      },
    }),
  ]);

  const rows: Transaction[] = transactions.map((tx) => ({
    id: tx.id,
    date: tx.date.toISOString(),
    type: tx.type as Transaction["type"],
    category: tx.category ?? undefined,
    description: tx.description,
    amount: decimalToNumber(tx.amount),
    currency: tx.currency,
    isRecurring: tx.isRecurring,
    bankAccountName: tx.bankAccount?.name,
    bankAccountId: tx.bankAccountId ?? undefined,
  }));

  const distinctCategories = categoryGroups
    .map((group) => group.category)
    .filter((category): category is string => Boolean(category));

  const categoryOptions = Array.from(
    new Set([...COMMON_CATEGORIES, ...distinctCategories]),
  );

  const filterOptions: TransactionFilterOptions = {
    categories: categoryOptions,
    accounts: bankAccounts,
  };

  return (
    <TransactionsList
      transactions={rows}
      orgCurrency={org.currency}
      filterOptions={filterOptions}
    />
  );
}
