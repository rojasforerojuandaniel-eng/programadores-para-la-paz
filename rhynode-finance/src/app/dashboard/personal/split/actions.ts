"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { Prisma } from "@/generated/prisma/client";

/**
 * Persistent split-bills storage. The page keeps a single group per user
 * (members + expenses) and calls these actions to load/save it. Both actions
 * are defensive: if the split tables don't exist yet (migration not applied),
 * the Prisma error is caught and surfaced as `migrated: false` so the page
 * falls back to localStorage with zero regression.
 */

export interface SplitMemberInput {
  id: string;
  name: string;
}
export interface SplitExpenseInput {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
}
export interface SplitState {
  members: SplitMemberInput[];
  expenses: SplitExpenseInput[];
}

const TABLES_MISSING = ["P2021", "P2022"]; // Prisma: table/relation does not exist

function isMissingTableError(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error) {
    return TABLES_MISSING.includes((error as { code: string }).code);
  }
  return false;
}

/** Loads the user's split group from the DB. Returns null if none or not migrated. */
export async function getSplitGroup(): Promise<{ state: SplitState; migrated: true } | { migrated: false }> {
  const profile = await getUserProfile();
  if (!profile) return { migrated: false };

  try {
    const prisma = getPrisma();
    const group = await prisma.splitGroup.findUnique({
      where: { userId: profile.id },
      include: {
        members: { orderBy: { position: "asc" } },
        expenses: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!group) return { state: { members: [], expenses: [] }, migrated: true };
    return {
      state: {
        members: group.members.map((m) => ({ id: m.id, name: m.name })),
        expenses: group.expenses.map((e) => ({
          id: e.id,
          description: e.description,
          amount: e.amount.toNumber(),
          paidBy: e.paidByMemberId,
        })),
      },
      migrated: true,
    };
  } catch (error) {
    if (isMissingTableError(error)) return { migrated: false };
    logger.error("Failed to load split group", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { migrated: false };
  }
}

/** Persists the user's split group snapshot (replaces members + expenses). */
export async function saveSplitGroup(input: SplitState): Promise<{ ok: boolean; migrated: boolean }> {
  const profile = await getUserProfile();
  if (!profile) return { ok: false, migrated: false };

  const memberIds = new Set(input.members.map((m) => m.id));
  // Drop expenses whose payer isn't in the member set (consistency guard).
  const safeExpenses = input.expenses.filter((e) => memberIds.has(e.paidBy));

  try {
    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      const group = await tx.splitGroup.upsert({
        where: { userId: profile.id },
        create: { userId: profile.id, name: "Grupo", currency: "COP" },
        update: {},
      });
      // Wipe and recreate (cascade deletes expenses via paidBy relation).
      await tx.splitMember.deleteMany({ where: { groupId: group.id } });
      for (let i = 0; i < input.members.length; i++) {
        const m = input.members[i];
        await tx.splitMember.create({
          data: {
            id: m.id,
            groupId: group.id,
            name: m.name,
            position: i,
          },
        });
      }
      for (const e of safeExpenses) {
        await tx.splitExpense.create({
          data: {
            id: e.id,
            groupId: group.id,
            description: e.description,
            amount: new Prisma.Decimal(e.amount),
            paidByMemberId: e.paidBy,
          },
        });
      }
    });
    revalidatePath("/dashboard/personal/split");
    return { ok: true, migrated: true };
  } catch (error) {
    if (isMissingTableError(error)) return { ok: false, migrated: false };
    logger.error("Failed to save split group", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, migrated: false };
  }
}