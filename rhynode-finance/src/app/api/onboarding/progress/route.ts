import { NextResponse } from "next/server";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

const CHECKLIST_ITEM_IDS = [
  "complete-profile",
  "connect-bank",
  "create-goal",
  "add-transaction",
  "explore-dashboard",
] as const;

const postSchema = z.object({
  items: z.record(z.string(), z.boolean()).optional(),
  onboardingCompleted: z.boolean().optional(),
});

function getChecklistState(profile: { metadata: unknown }) {
  const metadata = (profile.metadata ?? {}) as Record<string, unknown>;
  const checklist = metadata.onboardingChecklist;
  const validChecklist =
    typeof checklist === "object" &&
    checklist !== null &&
    !Array.isArray(checklist) &&
    checklist;

  return {
    metadata,
    checklist: validChecklist
      ? (checklist as Record<string, boolean>)
      : ({} as Record<string, boolean>),
  };
}

export async function GET() {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { checklist } = getChecklistState(profile);

    return NextResponse.json({
      items: checklist,
      onboardingCompleted:
        profile.onboardingCompleted || org.onboardingCompleted,
    });
  } catch (error) {
    logger.error("Failed to get onboarding progress", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to get onboarding progress" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const org = await requireAuth();
    if (!org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { metadata, checklist } = getChecklistState(profile);
    const nextChecklist = { ...checklist, ...(parsed.data.items ?? {}) };
    const allDone = CHECKLIST_ITEM_IDS.every((id) => nextChecklist[id]);
    const onboardingCompleted =
      parsed.data.onboardingCompleted ??
      (allDone || profile.onboardingCompleted || org.onboardingCompleted);

    const nextMetadata: Record<string, unknown> = {
      ...metadata,
      onboardingChecklist: nextChecklist,
    };

    await prisma.$transaction([
      prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          metadata: nextMetadata as unknown as Prisma.InputJsonValue,
          onboardingCompleted,
        },
      }),
      prisma.organization.update({
        where: { id: org.id },
        data: { onboardingCompleted },
      }),
    ]);

    return NextResponse.json({
      items: nextChecklist,
      onboardingCompleted,
    });
  } catch (error) {
    logger.error("Failed to save onboarding progress", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to save onboarding progress" },
      { status: 500 },
    );
  }
}
