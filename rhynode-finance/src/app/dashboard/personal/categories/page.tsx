import { Suspense } from "react";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ServerDataTable } from "@/components/dashboard/server-data-table";
import { EmptyStateCard } from "@/components/dashboard/empty-state-card";
import { TableCell } from "@/components/ui/table";
import { CreateCategoryDialog } from "./create-dialog";
import { Tags } from "lucide-react";

function EmptyState() {
  return (
    <EmptyStateCard
      variant="lg"
      icon={Tags}
      title="Organiza tus movimientos"
      description="Crea categorías personalizadas para clasificar ingresos y gastos con precisión."
      hint="Empieza creando tu primera categoría."
      action={<CreateCategoryDialog categories={[]} />}
    />
  );
}

export default async function CategoriesPage() {
  const profile = await getUserProfile();
  if (!profile) return null;

  const prisma = getPrisma();
  const categories = await prisma.category.findMany({
    where: { userId: profile.id },
    include: { parent: true },
    orderBy: { createdAt: "desc" },
  });

  const columns = [
    { key: "name", header: "Nombre" },
    { key: "type", header: "Tipo" },
    { key: "icon", header: "Icono" },
    { key: "color", header: "Color" },
    { key: "parent", header: "Padre" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-section">Categorías</h1>
          <p className="body-default mt-1">Administra tus categorías de gastos e ingresos</p>
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
              <TableCell className="py-3 font-medium">{category.name}</TableCell>
              <TableCell className="py-3">
                <Badge variant="outline">{category.type}</Badge>
              </TableCell>
              <TableCell className="py-3 text-muted-foreground">{category.icon || "-"}</TableCell>
              <TableCell className="py-3">
                {category.color ? (
                  <span
                    className="inline-block h-4 w-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="py-3 text-muted-foreground">
                {category.parent?.name || "-"}
              </TableCell>
            </>
          )}
          renderCard={(category) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {category.color ? (
                    <span
                      className="inline-block h-4 w-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                  ) : (
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[9px] text-muted-foreground">-</span>
                  )}
                  <span className="font-medium">{category.name}</span>
                </div>
                <Badge variant="outline">{category.type}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-muted-foreground">Icono</div>
                <div className="text-right text-muted-foreground">{category.icon || "-"}</div>
                <div className="text-muted-foreground">Padre</div>
                <div className="text-right text-muted-foreground">{category.parent?.name || "-"}</div>
              </div>
            </div>
          )}
        />
      </Suspense>
    </div>
  );
}
