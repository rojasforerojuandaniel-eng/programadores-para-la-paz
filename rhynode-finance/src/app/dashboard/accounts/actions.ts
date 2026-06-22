"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { toDecimal } from "@/lib/decimal";
import { getLocale } from "@/lib/locale-server";

const updateBankAccountSchema = z.object({
  name: z.string().min(1, "nameRequired"),
  bankName: z.string().min(1, "bankRequired"),
  accountNumber: z.string().optional(),
  type: z.enum(["CHECKING", "SAVINGS", "CREDIT", "VIRTUAL"]),
  currency: z.enum(["COP", "MXN", "BRL", "USD"]),
  balance: z.number(),
});

export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;

async function errorsT() {
  const locale = await getLocale();
  return getTranslations({ locale, namespace: "dashboard.accounts.actions.errors" });
}

async function validationT() {
  const locale = await getLocale();
  return getTranslations({ locale, namespace: "dashboard.accounts.actions.validation" });
}

export async function updateBankAccount(
  id: string,
  input: UpdateBankAccountInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const org = await requireAuth();
    if (!org) {
      return { success: false, error: (await errorsT())("unauthorized") };
    }

    const vT = await validationT();
    const parsed = updateBankAccountSchema.safeParse(input);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const message =
        firstIssue?.code === "too_small" && firstIssue.message === "nameRequired"
          ? vT("nameRequired")
          : firstIssue?.message === "bankRequired"
            ? vT("bankRequired")
            : (await errorsT())("invalidData");
      return { success: false, error: message };
    }

    const prisma = getPrisma();
    const existing = await prisma.bankAccount.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!existing) {
      return { success: false, error: (await errorsT())("notFound") };
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
    return { success: false, error: (await errorsT())("updateFailed") };
  }
}

export async function deleteBankAccount(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const org = await requireAuth();
    if (!org) {
      return { success: false, error: (await errorsT())("unauthorized") };
    }

    const prisma = getPrisma();
    const existing = await prisma.bankAccount.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!existing) {
      return { success: false, error: (await errorsT())("notFound") };
    }

    await prisma.bankAccount.delete({ where: { id } });
    revalidatePath("/dashboard/accounts");
    return { success: true };
  } catch {
    return { success: false, error: (await errorsT())("deleteFailed") };
  }
}
