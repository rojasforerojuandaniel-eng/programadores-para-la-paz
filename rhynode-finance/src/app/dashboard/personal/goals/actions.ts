"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";

const addSavingsSchema = z.object({
  goalId: z.string().min(1),
  amount: z.number().min(0.01, "El monto debe ser mayor a 0"),
});

export type AddSavingsInput = z.infer<typeof addSavingsSchema>;

export async function addSavings(
  input: AddSavingsInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: "No autorizado" };
    }

    const parsed = addSavingsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Datos inválidos" };
    }

    const prisma = getPrisma();
    const goal = await prisma.goal.findFirst({
      where: { id: parsed.data.goalId, userId: profile.id },
    });

    if (!goal) {
      return { success: false, error: "Meta no encontrada" };
    }

    const newAmount = goal.currentAmount.add(toDecimal(parsed.data.amount));
    const isCompleted = newAmount.gte(goal.targetAmount);

    await prisma.goal.update({
      where: { id: goal.id },
      data: {
        currentAmount: newAmount,
        status: isCompleted ? "COMPLETED" : goal.status,
      },
    });

    revalidatePath("/dashboard/personal/goals");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo añadir el ahorro" };
  }
}
