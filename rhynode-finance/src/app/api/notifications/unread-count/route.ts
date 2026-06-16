import { NextResponse } from "next/server";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();
    const count = await prisma.notification.count({
      where: { userId: profile.id, read: false },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Failed to fetch unread notifications count:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications count" },
      { status: 500 }
    );
  }
}
