"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import type { CategoryType } from "./types";

const updateCategorySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
  parentId: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: "No autorizado" };
    }

    const parsed = updateCategorySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Datos inválidos" };
    }

    const prisma = getPrisma();
    const existing = await prisma.category.findUnique({
      where: { id, userId: profile.id },
    });

    if (!existing) {
      return { success: false, error: "Categoría no encontrada" };
    }

    if (existing.isDefault) {
      return { success: false, error: "No se puede editar una categoría por defecto" };
    }

    if (parsed.data.parentId) {
      if (parsed.data.parentId === id) {
        return { success: false, error: "Una categoría no puede ser su propio padre" };
      }
      const parent = await prisma.category.findUnique({
        where: { id: parsed.data.parentId, userId: profile.id },
      });
      if (!parent) {
        return { success: false, error: "Categoría padre no válida" };
      }
    }

    await prisma.category.update({
      where: { id },
      data: {
        name: parsed.data.name,
        type: parsed.data.type as CategoryType,
        parentId: parsed.data.parentId || null,
        icon: parsed.data.icon || null,
        color: parsed.data.color || null,
      },
    });

    revalidatePath("/dashboard/personal/categories");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo actualizar la categoría" };
  }
}

export async function deleteCategory(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: "No autorizado" };
    }

    const prisma = getPrisma();
    const existing = await prisma.category.findUnique({
      where: { id, userId: profile.id },
    });

    if (!existing) {
      return { success: false, error: "Categoría no encontrada" };
    }

    if (existing.isDefault) {
      return { success: false, error: "No se puede eliminar una categoría por defecto" };
    }

    await prisma.category.delete({ where: { id } });
    revalidatePath("/dashboard/personal/categories");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo eliminar la categoría" };
  }
}
