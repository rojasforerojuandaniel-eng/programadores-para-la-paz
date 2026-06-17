import { NextResponse } from "next/server";
import { z } from "zod";
import { withRateLimit } from "@/lib/with-rate-limit";
import { getUserRules, saveUserRules } from "@/lib/rules-store";
import { logger } from "@/lib/logger";
import type { Rule } from "@/lib/rules-engine";

const ruleConditionSchema = z.object({
  type: z.enum(["contains", "amountGreaterThan", "typeIs", "categoryIs"]),
  value: z.string().min(1),
});

const ruleActionSchema = z.object({
  type: z.enum(["setCategory", "setProject", "addTag", "alert"]),
  value: z.string().min(1),
});

const createRuleSchema = z.object({
  name: z.string().min(1),
  condition: ruleConditionSchema,
  action: ruleActionSchema,
  enabled: z.boolean().default(true),
});

const updateRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  condition: ruleConditionSchema,
  action: ruleActionSchema,
  enabled: z.boolean().default(true),
});

function generateRuleId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export const GET = withRateLimit(
  async () => {
    try {
      const result = await getUserRules();
      if (!result) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.json({ rules: result.rules });
    } catch (error) {
      logger.error("Failed to fetch rules", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to fetch rules" },
        { status: 500 }
      );
    }
  },
  { key: "rules-read", maxRequests: 60, windowMs: 60000 }
);

export const POST = withRateLimit(
  async (request: Request) => {
    try {
      const result = await getUserRules();
      if (!result) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const parsed = createRuleSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const newRule: Rule = {
        id: generateRuleId(),
        ...parsed.data,
      };

      const nextRules = [newRule, ...result.rules];
      const saved = await saveUserRules(result.userId, nextRules);
      if (!saved.success) {
        return NextResponse.json({ error: saved.error }, { status: 500 });
      }

      return NextResponse.json({ rule: newRule });
    } catch (error) {
      logger.error("Failed to create rule", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to create rule" },
        { status: 500 }
      );
    }
  },
  { key: "rules-write", maxRequests: 20, windowMs: 60000 }
);

export const PUT = withRateLimit(
  async (request: Request) => {
    try {
      const result = await getUserRules();
      if (!result) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const parsed = updateRuleSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const existingIndex = result.rules.findIndex((r) => r.id === parsed.data.id);
      if (existingIndex === -1) {
        return NextResponse.json({ error: "Rule not found" }, { status: 404 });
      }

      const updatedRule: Rule = { ...parsed.data };
      const nextRules = result.rules.map((rule) =>
        rule.id === updatedRule.id ? updatedRule : rule
      );

      const saved = await saveUserRules(result.userId, nextRules);
      if (!saved.success) {
        return NextResponse.json({ error: saved.error }, { status: 500 });
      }

      return NextResponse.json({ rule: updatedRule });
    } catch (error) {
      logger.error("Failed to update rule", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to update rule" },
        { status: 500 }
      );
    }
  },
  { key: "rules-write", maxRequests: 20, windowMs: 60000 }
);

export const DELETE = withRateLimit(
  async (request: Request) => {
    try {
      const result = await getUserRules();
      if (!result) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");
      if (!id) {
        return NextResponse.json(
          { error: "Missing id query parameter" },
          { status: 400 }
        );
      }

      const existingIndex = result.rules.findIndex((r) => r.id === id);
      if (existingIndex === -1) {
        return NextResponse.json({ error: "Rule not found" }, { status: 404 });
      }

      const nextRules = result.rules.filter((rule) => rule.id !== id);
      const saved = await saveUserRules(result.userId, nextRules);
      if (!saved.success) {
        return NextResponse.json({ error: saved.error }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error("Failed to delete rule", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to delete rule" },
        { status: 500 }
      );
    }
  },
  { key: "rules-write", maxRequests: 20, windowMs: 60000 }
);
