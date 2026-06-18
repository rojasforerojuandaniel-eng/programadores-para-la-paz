import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getUserProfile } from "@/lib/auth";
import type { Rule } from "@/lib/rules-engine";
import { logger } from "@/lib/logger";

const RULES_METADATA_KEY = "rules";

interface RulesMetadataContainer {
  version: number;
  items: Rule[];
}

function isRule(value: unknown): value is Rule {
  if (typeof value !== "object" || value === null) return false;
  const rule = value as Partial<Rule>;
  return (
    typeof rule.id === "string" &&
    typeof rule.name === "string" &&
    typeof rule.enabled === "boolean" &&
    rule.condition !== undefined &&
    typeof rule.condition.type === "string" &&
    typeof rule.condition.value === "string" &&
    rule.action !== undefined &&
    typeof rule.action.type === "string" &&
    typeof rule.action.value === "string"
  );
}

export async function getUserRules(): Promise<{ rules: Rule[]; userId: string } | null> {
  const profile = await getUserProfile();
  if (!profile) return null;

  const metadata = (profile.metadata ?? {}) as Record<string, unknown>;
  const container = metadata[RULES_METADATA_KEY] as RulesMetadataContainer | undefined;
  const items = Array.isArray(container?.items) ? container.items : [];
  const rules = items.filter(isRule);

  return { rules, userId: profile.id };
}

export async function saveUserRules(
  userId: string,
  rules: Rule[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const prisma = getPrisma();
    const profile = await prisma.userProfile.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    const metadata = (profile.metadata ?? {}) as Record<string, unknown>;
    metadata[RULES_METADATA_KEY] = { version: 1, items: rules };

    await prisma.userProfile.update({
      where: { id: userId },
      data: { metadata: metadata as Prisma.InputJsonValue },
    });

    return { success: true };
  } catch (error) {
    logger.error("Failed to save user rules", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: "Failed to save rules" };
  }
}

/**
 * Categorization learning: when the user corrects a transaction's category,
 * persist a "contains description → setCategory" rule so future transactions
 * with the same description auto-categorize. No-op if an identical rule
 * already exists (avoids duplicates on repeated corrections).
 */
export async function learnCategoryFromCorrection(
  userId: string,
  description: string,
  category: string
): Promise<{ learned: boolean }> {
  const needle = description.toLowerCase().trim();
  if (!needle || !category) return { learned: false };

  const existing = await getUserRules();
  if (!existing) return { learned: false };

  const alreadyLearned = existing.rules.some(
    (rule) =>
      rule.condition.type === "contains" &&
      rule.condition.value === needle &&
      rule.action.type === "setCategory" &&
      rule.action.value === category
  );
  if (alreadyLearned) return { learned: false };

  const newRule: Rule = {
    id: `learned-${needle.replace(/\s+/g, "-").slice(0, 24)}-${Date.now().toString(36)}`,
    name: `Auto: "${needle}" → ${category}`,
    enabled: true,
    condition: { type: "contains", value: needle },
    action: { type: "setCategory", value: category },
  };

  const result = await saveUserRules(existing.userId, [...existing.rules, newRule]);
  return { learned: result.success };
}
