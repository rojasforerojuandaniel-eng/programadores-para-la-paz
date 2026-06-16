import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/auth";
import { checkAndUnlockAchievement } from "@/lib/achievements";
import { z } from "zod";

const postSchema = z.object({
  action: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action } = parsed.data;
    const unlocked: Awaited<ReturnType<typeof checkAndUnlockAchievement>>[] = [];

    if (action) {
      const actionToAchievement: Record<string, string> = {
        CREATE_TRANSACTION: "FIRST_TRANSACTION",
        CREATE_BUDGET: "FIRST_BUDGET",
        CREATE_GOAL: "FIRST_GOAL",
        CREATE_INVOICE: "FIRST_INVOICE",
        UPLOAD_RECEIPT: "FIRST_RECEIPT",
      };

      const achievementType = actionToAchievement[action];
      if (achievementType) {
        const result = await checkAndUnlockAchievement(profile.id, achievementType);
        if (result) unlocked.push(result);
      }
    } else {
      const typesToCheck = [
        "FIRST_TRANSACTION",
        "FIRST_BUDGET",
        "FIRST_GOAL",
        "FIRST_INVOICE",
        "FIRST_RECEIPT",
      ];

      for (const type of typesToCheck) {
        const result = await checkAndUnlockAchievement(profile.id, type);
        if (result) unlocked.push(result);
      }
    }

    return NextResponse.json({ unlocked });
  } catch (error) {
    console.error("Failed to check achievements:", error);
    return NextResponse.json(
      { error: "Failed to check achievements" },
      { status: 500 }
    );
  }
}
