import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { withRateLimit } from "@/lib/with-rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import type { Scenario } from "@/lib/scenarios";

const scenarioSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["optimistic", "base", "pessimistic"]),
  incomeAdjustment: z.number().int().min(-100).max(100),
  expenseAdjustment: z.number().int().min(-100).max(100),
  durationMonths: z.number().int().min(1).max(60),
});

interface ScenariosMetadata {
  scenarios?: unknown[];
}

function getScenarios(profile: { metadata: unknown | null }): Scenario[] {
  const metadata = (profile.metadata ?? {}) as ScenariosMetadata;
  const raw = metadata.scenarios;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is Scenario =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Scenario).id === "string" &&
      typeof (item as Scenario).name === "string"
  );
}

export const GET = withRateLimit(
  async () => {
    try {
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const scenarios = getScenarios(profile);
      return NextResponse.json({ scenarios });
    } catch (error) {
      logger.error("Failed to fetch scenarios", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to fetch scenarios" },
        { status: 500 }
      );
    }
  },
  { key: "scenarios-read", maxRequests: 60, windowMs: 60000 }
);

export const POST = withRateLimit(
  async (request: Request) => {
    try {
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const parsed = scenarioSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const existing = getScenarios(profile);
      const scenario: Scenario = {
        id: crypto.randomUUID(),
        ...parsed.data,
        createdAt: new Date().toISOString(),
      };
      const updated = [scenario, ...existing];

      const metadata = (profile.metadata ?? {}) as ScenariosMetadata;
      await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          metadata: JSON.parse(
            JSON.stringify({
              ...metadata,
              scenarios: updated,
            })
          ),
        },
      });

      return NextResponse.json({ scenario });
    } catch (error) {
      logger.error("Failed to create scenario", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to create scenario" },
        { status: 500 }
      );
    }
  },
  { key: "scenarios-create", maxRequests: 20, windowMs: 60000 }
);

export const DELETE = withRateLimit(
  async (request: Request) => {
    try {
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");
      if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
      }

      const existing = getScenarios(profile);
      const next = existing.filter((s) => s.id !== id);
      if (next.length === existing.length) {
        return NextResponse.json(
          { error: "Scenario not found" },
          { status: 404 }
        );
      }

      const metadata = (profile.metadata ?? {}) as ScenariosMetadata;
      await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          metadata: JSON.parse(
            JSON.stringify({
              ...metadata,
              scenarios: next,
            })
          ),
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error("Failed to delete scenario", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to delete scenario" },
        { status: 500 }
      );
    }
  },
  { key: "scenarios-delete", maxRequests: 20, windowMs: 60000 }
);
