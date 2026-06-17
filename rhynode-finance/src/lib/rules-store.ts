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
