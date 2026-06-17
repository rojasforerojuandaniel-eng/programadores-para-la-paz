"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";

const updateBankAccountSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  bankName: z.string().min(1, "El banco es obligatorio"),
  accountNumber: z.string().optional(),
  type: z.enum(["CHECKING", "SAVINGS", "CREDIT", "VIRTUAL"]),
  currency: z.enum(["COP", "MXN", "BRL", "USD"]),
  balance: z.number(),
});

export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;

export async function updateBankAccount(
  id: string,
  input: UpdateBankAccountInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const org = await requireAuth();
    if (!org) {
      return { success: false, error: "No autorizado" };
    }

    const parsed = updateBankAccountSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Datos inválidos" };
    }

    const prisma = getPrisma();
    const existing = await prisma.bankAccount.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!existing) {
      return { success: false, error: "Cuenta no encontrada" };
    }

    await prisma.bankAccount.update({
      where: { id },
      data: {
        name: parsed.data.name,
        bankName: parsed.data.bankName,
        accountNumber: parsed.data.accountNumber,
        type: parsed.data.type,
        currency: parsed.data.currency,
        balance: toDecimal(parsed.data.balance),
      },
    });

    revalidatePath("/dashboard/accounts");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo actualizar la cuenta" };
  }
}

export async function deleteBankAccount(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const org = await requireAuth();
    if (!org) {
      return { success: false, error: "No autorizado" };
    }

    const prisma = getPrisma();
    const existing = await prisma.bankAccount.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!existing) {
      return { success: false, error: "Cuenta no encontrada" };
    }

    await prisma.bankAccount.delete({ where: { id } });
    revalidatePath("/dashboard/accounts");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo eliminar la cuenta" };
  }
}
