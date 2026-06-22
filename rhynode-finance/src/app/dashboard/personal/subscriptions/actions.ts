"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { getUserProfile } from "@/lib/auth";
import { getLocale } from "@/lib/locale-server";
import { getPrisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
  amount: z.number().min(0, "El monto debe ser positivo"),
  currency: z.string().default("COP"),
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  provider: z.string().optional(),
  category: z.string().optional(),
});

export type UpdateSubscriptionInput = z.infer<typeof updateSchema>;

async function errorsT() {
  const locale = await getLocale();
  return getTranslations({ locale, namespace: "dashboard.subscriptions.actions.errors" });
}

export async function updateSubscription(
  id: string,
  input: UpdateSubscriptionInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: (await errorsT())("unauthorized") };
    }

    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: (await errorsT())("invalidData") };
    }

    const prisma = getPrisma();
    const existing = await prisma.detectedSubscription.findFirst({
      where: { id, userId: profile.id },
    });

    if (!existing) {
      return { success: false, error: (await errorsT())("notFound") };
    }

    await prisma.detectedSubscription.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        frequency: parsed.data.frequency,
        provider: parsed.data.provider || null,
        category: parsed.data.category || null,
      },
    });

    revalidatePath("/dashboard/personal/subscriptions");
    return { success: true };
  } catch {
    return { success: false, error: (await errorsT())("updateFailed") };
  }
}

export async function markSubscriptionForCancel(
  id: string,
  mark: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: (await errorsT())("unauthorized") };
    }

    const prisma = getPrisma();
    const existing = await prisma.detectedSubscription.findFirst({
      where: { id, userId: profile.id },
    });

    if (!existing) {
      return { success: false, error: (await errorsT())("notFound") };
    }

    const nextStatus = mark ? "PENDING_CANCELLATION" : "ACTIVE";

    await prisma.detectedSubscription.update({
      where: { id },
      data: { status: nextStatus },
    });

    revalidatePath("/dashboard/personal/subscriptions");
    return { success: true };
  } catch {
    return { success: false, error: (await errorsT())("statusFailed") };
  }
}

export async function deleteSubscription(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return { success: false, error: (await errorsT())("unauthorized") };
    }

    const prisma = getPrisma();
    const existing = await prisma.detectedSubscription.findFirst({
      where: { id, userId: profile.id },
    });

    if (!existing) {
      return { success: false, error: (await errorsT())("notFound") };
    }

    await prisma.detectedSubscription.delete({ where: { id } });
    revalidatePath("/dashboard/personal/subscriptions");
    return { success: true };
  } catch {
    return { success: false, error: (await errorsT())("deleteFailed") };
  }
}