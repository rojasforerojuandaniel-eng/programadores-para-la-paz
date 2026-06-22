import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocale } from "@/lib/locale-server";
import { formatCurrency } from "@/lib/format";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { CreateCategoryDialog } from "./create-dialog";
import { CategoryActions } from "./category-actions";
import { CategoryIcon } from "./category-icon";
import { getContrastColor } from "./utils";
import { Tags, TrendingDown, TrendingUp } from "lucide-react";
import type { CategoryRow, CategoryType } from "./types";

interface BudgetSummary {
  id: string;
  name: string;
  amount: number;
  spent: number;
}

interface CategoryWithStats {
  id: string;
  userId: string | null;
  name: string;
  type: CategoryType;
  parentId: string | null;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  parent: { name: string } | null;
  spent: number;
  earned: number;
  totalFlow: number;
  budgets: BudgetSummary[];
}

const typeLabelKeys: Record<CategoryType, string> = {
  INCOME: "types.INCOME",
  EXPENSE: "types.EXPENSE",
  TRANSFER: "types.TRANSFER",
};

async function EmptyState() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "dashboard.categories" });
  return (
    <EmptyStateCard
      variant="lg"
      icon={Tags}
      title={t("empty.title")}
      description={t("empty.description")}
      hint={t("empty.hint")}
      action={<CreateCategoryDialog categories={[]} />}
    />
  );
}

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

async function TypeBadge({ type }: { type: CategoryType }) {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "dashboard.categories" });
  if (type === "INCOME") {
    return (
      <Badge className="gap-1 border-transparent bg-success/10 text-success hover:bg-success/10">
        <TrendingUp className="h-3 w-3" aria-hidden="true" />
        {t(typeLabelKeys[type] as never)}
      </Badge>
    );
  }
  if (type === "EXPENSE") {
    return (
      <Badge className="gap-1 border-transparent bg-danger/10 text-danger hover:bg-danger/10">
        <TrendingDown className="h-3 w-3" aria-hidden="true" />
        {t(typeLabelKeys[type] as never)}
      </Badge>
    );
  }
  return <Badge variant="outline">{t(typeLabelKeys[type] as never)}</Badge>;
}

async function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "dashboard.categories" });
  const width = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const overBudget = spent > budget;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("budget.label")}</span>
        <span className="font-medium text-foreground">
          {formatCurrency(spent, "COP", locale)} / {formatCurrency(budget, "COP", locale)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${overBudget ? "bg-danger" : "bg-primary"}`}
          style={{ width: `${width}%` }}
        />
      </div>
      {overBudget ? <p className="text-xs text-danger">{t("budget.over")}</p> : null}
    </div>
  );
}

async function CategoryCard({
  category,
  categories,
}: {
  category: CategoryWithStats;
  categories: CategoryRow[];
}) {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "dashboard.categories" });
  const primaryAmount =
    category.type === "INCOME" ? category.earned : category.spent;
  const fgClass = getContrastColor(category.color);
  const mainBudget = category.budgets[0];

  const categoryRow: CategoryRow = {
    id: category.id,
    userId: category.userId,
    name: category.name,
    type: category.type,
    parentId: category.parentId,
    icon: category.icon,
    color: category.color,
    isDefault: category.isDefault,
    parent: category.parent,
    spent: category.spent,
    earned: category.earned,
    totalFlow: category.totalFlow,
  };

  return (
    <div className="surface-elevated-2 relative rounded-xl p-5">
      <div className="absolute right-3 top-3">
        <CategoryActions category={categoryRow} categories={categories} />
      </div>

      <div className="flex items-start gap-3 pr-8">
        <span
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${fgClass}`}
          style={{ backgroundColor: category.color || "var(--primary)" }}
        >
          <CategoryIcon name={category.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{category.name}</p>
          {category.parent?.name ? (
            <p className="truncate text-xs text-muted-foreground">{category.parent.name}</p>
          ) : null}
          <div className="mt-1">
            <TypeBadge type={category.type} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">{t("card.spentMonth")}</p>
          <p className="font-medium text-danger">{formatCurrency(category.spent, "COP", locale)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{t("card.earnedMonth")}</p>
          <p className="font-medium text-success">{formatCurrency(category.earned, "COP", locale)}</p>
        </div>
      </div>

      {category.type === "EXPENSE" && primaryAmount > 0 ? (
        <div className="mt-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("card.monthProportion")}</span>
              <span className="font-medium text-foreground">{formatCurrency(primaryAmount, "COP", locale)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: "100%",
                  backgroundColor: category.color || "var(--primary)",
                  opacity: 0.7,
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {mainBudget ? (
        <div className="mt-4">
          <BudgetBar spent={mainBudget.spent} budget={mainBudget.amount} />
        </div>
      ) : null}
    </div>
  );
}

export default async function CategoriesPage() {
  const profile = await getUserProfile();
  if (!profile) return null;

  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "dashboard.categories" });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const prisma = getPrisma();
  const rawCategories = await prisma.category.findMany({
    where: { userId: profile.id },
    include: { parent: true, budgets: true },
    orderBy: { createdAt: "desc" },
  });

  const categoryIds = rawCategories.map((c) => c.id);

  const monthlyTotals =
    categoryIds.length > 0
      ? await prisma.transaction.groupBy({
          by: ["categoryId", "type"],
          where: {
            categoryId: { in: categoryIds },
            date: { gte: startOfMonth, lt: endOfMonth },
          },
          _sum: { amount: true },
        })
      : [];

  const totalsMap = new Map<string, { spent: number; earned: number }>();
  for (const cat of rawCategories) {
    totalsMap.set(cat.id, { spent: 0, earned: 0 });
  }
  for (const row of monthlyTotals) {
    if (!row.categoryId) continue;
    const sum = Number(row._sum.amount ?? 0);
    const current = totalsMap.get(row.categoryId) || { spent: 0, earned: 0 };
    if (row.type === "EXPENSE") {
      current.spent += sum;
    } else if (row.type === "INCOME") {
      current.earned += sum;
    } else {
      current.spent += sum;
      current.earned += sum;
    }
    totalsMap.set(row.categoryId, current);
  }

  const categories: CategoryWithStats[] = rawCategories.map((cat) => {
    const totals = totalsMap.get(cat.id) || { spent: 0, earned: 0 };
    return {
      id: cat.id,
      userId: cat.userId,
      name: cat.name,
      type: cat.type as CategoryType,
      parentId: cat.parentId,
      icon: cat.icon,
      color: cat.color,
      isDefault: cat.isDefault,
      parent: cat.parent,
      spent: totals.spent,
      earned: totals.earned,
      totalFlow: totals.spent + totals.earned,
      budgets: cat.budgets.map((b) => ({
        id: b.id,
        name: b.name,
        amount: decimalToNumber(b.amount),
        spent: decimalToNumber(b.spent),
      })),
    };
  });

  const categoryRows: CategoryRow[] = categories.map((c) => ({
    id: c.id,
    userId: c.userId,
    name: c.name,
    type: c.type,
    parentId: c.parentId,
    icon: c.icon,
    color: c.color,
    isDefault: c.isDefault,
    parent: c.parent,
    spent: c.spent,
    earned: c.earned,
    totalFlow: c.totalFlow,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">{t("title")}</h1>
          <p className="body-default mt-1">{t("subtitle")}</p>
        </div>
        <CreateCategoryDialog categories={categoryRows} />
      </div>

      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        {categories.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {categories.map((category) => (
              <li key={category.id}>
                <CategoryCard category={category} categories={categoryRows} />
              </li>
            ))}
          </ul>
        )}
      </Suspense>
    </div>
  );
}