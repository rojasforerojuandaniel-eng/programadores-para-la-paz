import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { z } from "zod";

const preferenceSchema = z.object({
  budgets: z.boolean().optional(),
  subscriptions: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
});

export async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId: profile.id },
    });

    return NextResponse.json({
      budgets: prefs?.budgets ?? true,
      subscriptions: prefs?.subscriptions ?? true,
      weeklySummary: prefs?.weeklySummary ?? false,
    });
  } catch (error) {
    console.error("Failed to get notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to get preferences" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = preferenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: profile.id },
      update: {
        ...parsed.data,
      },
      create: {
        userId: profile.id,
        budgets: parsed.data.budgets ?? true,
        subscriptions: parsed.data.subscriptions ?? true,
        weeklySummary: parsed.data.weeklySummary ?? false,
      },
    });

    return NextResponse.json({
      budgets: prefs.budgets,
      subscriptions: prefs.subscriptions,
      weeklySummary: prefs.weeklySummary,
    });
  } catch (error) {
    console.error("Failed to save notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
