import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { z } from "zod";

const widgetSchema = z.object({
  id: z.string().min(1),
  visible: z.boolean(),
  order: z.number().int().min(0),
});

const postSchema = z.object({
  layout: z.array(widgetSchema),
});

interface WidgetMetadata {
  widgets?: Array<{
    id: string;
    visible: boolean;
    order: number;
  }>;
}

export async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metadata = (profile.metadata ?? {}) as WidgetMetadata;
    const widgets = metadata.widgets ?? [
      { id: "kpi-grid", visible: true, order: 1 },
      { id: "xp-bar", visible: true, order: 2 },
      { id: "ant-expenses", visible: false, order: 3 },
    ];

    return NextResponse.json({ widgets });
  } catch (error) {
    console.error("Failed to fetch widgets:", error);
    return NextResponse.json(
      { error: "Failed to fetch widgets" },
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
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { layout } = parsed.data;
    const metadata = (profile.metadata ?? {}) as WidgetMetadata;

    await prisma.userProfile.update({
      where: { id: profile.id },
      data: {
        metadata: JSON.parse(JSON.stringify({
          ...metadata,
          widgets: layout,
        })),
      },
    });

    return NextResponse.json({ widgets: layout });
  } catch (error) {
    console.error("Failed to save widgets:", error);
    return NextResponse.json(
      { error: "Failed to save widgets" },
      { status: 500 }
    );
  }
}
