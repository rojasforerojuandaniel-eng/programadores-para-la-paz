import { Suspense } from "react";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ServerDataTable } from "@/components/dashboard/server-data-table";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { TableCell } from "@/components/ui/table";
import { CreateCategoryDialog } from "./create-dialog";
import { CategoryActions } from "./category-actions";
import { CategoryIcon } from "./category-icon";
import { getContrastColor } from "./utils";
import { Tags, TrendingDown, TrendingUp } from "lucide-react";
import type { CategoryRow, CategoryType } from "./types";

function EmptyState() {
  return (
    <EmptyStateCard
      variant="lg"
      icon={Tags}
      title="Organiza tus movimientos"
      description="Crea categorías personalizadas para clasificar ingresos y gastos con precisión."
      hint="Empieza creando tu primera categoría y visualiza cuánto gastas e ingresas en cada una."
      action={<CreateCategoryDialog categories={[]} />}
    />
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function TypeBadge({ type }: { type: CategoryType }) {
  if (type === "INCOME") {
    return (
      <Badge className="gap-1 border-transparent bg-success/10 text-success hover:bg-success/10">
        <TrendingUp className="h-3 w-3" />
        Ingreso
      </Badge>
    );
  }
  if (type === "EXPENSE") {
    return (
      <Badge className="gap-1 border-transparent bg-danger/10 text-danger hover:bg-danger/10">
        <TrendingDown className="h-3 w-3" />
        Gasto
      </Badge>
    );
  }
  return <Badge variant="outline">Transferencia</Badge>;
}

function ProportionBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color?: string | null;
}) {
  const width = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${width}%`,
          backgroundColor: color || "var(--primary)",
        }}
      />
    </div>
  );
}

function CategoryCard({
  category,
  maxAmount,
}: {
  category: CategoryRow;
  maxAmount: number;
}) {
  const primaryAmount =
    category.type === "INCOME" ? category.earned : category.spent;
  const fgClass = getContrastColor(category.color);
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${fgClass}`}
            style={{ backgroundColor: category.color || "var(--primary)" }}
          >
            <CategoryIcon name={category.icon} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{category.name}</p>
            {category.parent?.name ? (
              <p className="truncate text-xs text-muted-foreground">
                {category.parent.name}
              </p>
            ) : null}
          </div>
        </div>
        <TypeBadge type={category.type} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Gastado</p>
          <p className="font-medium text-danger">{formatCurrency(category.spent)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Ingresado</p>
          <p className="font-medium text-success">{formatCurrency(category.earned)}</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Proporción</span>
          <span className="font-medium text-foreground">
            {formatCurrency(primaryAmount)}
          </span>
        </div>
        <ProportionBar value={primaryAmount} max={maxAmount} color={category.color} />
      </div>
    </div>
  );
}

export default async function CategoriesPage() {
  const profile = await getUserProfile();
  if (!profile) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const prisma = getPrisma();
  const rawCategories = await prisma.category.findMany({
    where: { userId: profile.id },
    include: { parent: true },
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

  const categories: CategoryRow[] = rawCategories.map((cat) => {
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
    };
  });

  const maxAmount = Math.max(
    ...categories.map((c) => (c.type === "INCOME" ? c.earned : c.spent)),
    1,
  );

  const columns = [
    { key: "category", header: "Categoría" },
    { key: "type", header: "Tipo" },
    { key: "spent", header: "Gastado mes" },
    { key: "earned", header: "Ingresado mes" },
    { key: "proportion", header: "Proporción" },
    { key: "actions", header: "" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">Categorías</h1>
          <p className="body-default mt-1">
            Administra tus categorías y visualiza tus movimientos del mes
          </p>
        </div>
        <CreateCategoryDialog categories={categories} />
      </div>

      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <ServerDataTable
          columns={columns}
          data={categories}
          emptyState={<EmptyState />}
          renderRow={(category) => (
            <>
              <TableCell className="py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getContrastColor(category.color)}`}
                    style={{ backgroundColor: category.color || "var(--primary)" }}
                  >
                    <CategoryIcon name={category.icon} className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium">{category.name}</p>
                    {category.parent?.name ? (
                      <p className="text-xs text-muted-foreground">{category.parent.name}</p>
                    ) : null}
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-3">
                <TypeBadge type={category.type} />
              </TableCell>
              <TableCell className="py-3 font-medium text-danger">
                {formatCurrency(category.spent)}
              </TableCell>
              <TableCell className="py-3 font-medium text-success">
                {formatCurrency(category.earned)}
              </TableCell>
              <TableCell className="py-3">
                <div className="w-32">
                  <ProportionBar
                    value={category.type === "INCOME" ? category.earned : category.spent}
                    max={maxAmount}
                    color={category.color}
                  />
                </div>
              </TableCell>
              <TableCell className="py-3 text-right">
                <CategoryActions category={category} categories={categories} />
              </TableCell>
            </>
          )}
          renderCard={(category) => (
            <div className="relative">
              <div className="absolute right-0 top-0">
                <CategoryActions category={category} categories={categories} />
              </div>
              <CategoryCard category={category} maxAmount={maxAmount} />
            </div>
          )}
        />
      </Suspense>
    </div>
  );
}
