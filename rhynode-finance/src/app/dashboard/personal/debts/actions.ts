"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { toDecimal, decimalToNumber } from "@/lib/decimal";

const recordPaymentSchema = z.object({
  debtId: z.string().min(1),
  amount: z.number().min(0.01, "El monto debe ser mayor a 0"),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export async function recordPayment(
  input: RecordPaymentInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: "No autorizado" };
    }

    const parsed = recordPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Datos inválidos" };
    }

    const prisma = getPrisma();
    const debt = await prisma.debt.findFirst({
      where: { id: parsed.data.debtId, userId: profile.id },
    });

    if (!debt) {
      return { success: false, error: "Deuda no encontrada" };
    }

    if (debt.status === "PAID") {
      return { success: false, error: "La deuda ya está pagada" };
    }

    const remaining = decimalToNumber(debt.remainingAmount);
    const payment = parsed.data.amount;
    const newRemaining = Math.max(0, remaining - payment);
    const isPaid = newRemaining === 0;

    await prisma.debt.update({
      where: { id: debt.id },
      data: {
        remainingAmount: toDecimal(newRemaining),
        status: isPaid ? "PAID" : debt.status,
      },
    });

    revalidatePath("/dashboard/personal/debts");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo registrar el pago" };
  }
}
