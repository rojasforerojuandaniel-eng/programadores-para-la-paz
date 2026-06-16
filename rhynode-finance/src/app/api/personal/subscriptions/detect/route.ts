import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { detectSubscriptions } from "@/lib/subscription-detector";

export async function POST() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: profile.id,
        scope: "PERSONAL",
        type: "EXPENSE",
      },
      orderBy: { date: "desc" },
    });

    const detected = detectSubscriptions(transactions);

    const upserted = await Promise.all(
      detected.map(async (sub) => {
        const existing = await prisma.detectedSubscription.findFirst({
          where: { userId: profile.id, name: sub.name },
        });

        if (existing) {
          return prisma.detectedSubscription.update({
            where: { id: existing.id },
            data: {
              amount: sub.amount,
              frequency: sub.frequency,
              provider: sub.provider,
              category: sub.category,
              lastDetectedAt: new Date(),
            },
          });
        }

        return prisma.detectedSubscription.create({
          data: {
            userId: profile.id,
            name: sub.name,
            description: sub.description,
            amount: sub.amount,
            currency: sub.currency,
            frequency: sub.frequency,
            provider: sub.provider,
            category: sub.category,
          },
        });
      })
    );

    return NextResponse.json({ subscriptions: upserted });
  } catch (error) {
    console.error("Subscription detection error:", error);
    return NextResponse.json({ error: "Failed to detect subscriptions" }, { status: 500 });
  }
}
