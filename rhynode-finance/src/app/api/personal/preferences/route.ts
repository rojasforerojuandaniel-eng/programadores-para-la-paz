import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { Prisma } from "@/generated/prisma/client";
import { withRateLimit } from "@/lib/with-rate-limit";

const waitlistEntrySchema = z.object({
  name: z.string(),
  email: z.string().email(),
  joinedAt: z.string().datetime(),
});

const preferencesSchema = z.object({
  dismissedNudges: z.array(z.string()).optional(),
  integrationWaitlist: z.record(z.string(), waitlistEntrySchema).optional(),
});

type UserPreferences = z.infer<typeof preferencesSchema>;

function getMetadataPreferences(profile: { metadata: unknown }): {
  metadata: Record<string, unknown>;
  preferences: UserPreferences;
} {
  const metadata = (profile.metadata ?? {}) as Record<string, unknown>;
  const rawPreferences = metadata.preferences;

  if (rawPreferences && typeof rawPreferences === "object" && !Array.isArray(rawPreferences)) {
    const parsed = preferencesSchema.safeParse(rawPreferences);
    if (parsed.success) {
      return { metadata, preferences: parsed.data };
    }
  }

  return { metadata, preferences: {} };
}

export const GET = withRateLimit(
  async () => {
    try {
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { preferences } = getMetadataPreferences(profile);
      return NextResponse.json(preferences);
    } catch (error) {
      logger.error("Failed to get user preferences", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to get user preferences" },
        { status: 500 },
      );
    }
  },
  { maxRequests: 60, windowMs: 60000 },
);

export const POST = withRateLimit(
  async (request: Request) => {
    try {
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }

      const parsed = preferencesSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const { metadata, preferences } = getMetadataPreferences(profile);
      const nextPreferences: UserPreferences = {
        ...preferences,
        ...parsed.data,
      };
      metadata.preferences = nextPreferences;

      const prisma = getPrisma();
      await prisma.userProfile.update({
        where: { id: profile.id },
        data: { metadata: metadata as unknown as Prisma.InputJsonValue },
      });

      return NextResponse.json(nextPreferences);
    } catch (error) {
      logger.error("Failed to save user preferences", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to save user preferences" },
        { status: 500 },
      );
    }
  },
  { maxRequests: 60, windowMs: 60000 },
);
