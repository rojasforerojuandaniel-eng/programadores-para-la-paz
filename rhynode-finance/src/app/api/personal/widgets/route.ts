import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile } from "@/lib/auth";
import { z } from "zod";
import { mergeLayouts, normalizeLayout, type WidgetLayoutItem } from "@/lib/widgets";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/with-rate-limit";

const widgetSchema = z.object({
  id: z.string().min(1),
  visible: z.boolean(),
  order: z.number().int().min(0),
});

const postSchema = z.object({
  layout: z.array(widgetSchema),
});

interface WidgetMetadata {
  widgets?: WidgetLayoutItem[];
}

export const GET = withRateLimit(async function GET() {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metadata = (profile.metadata ?? {}) as WidgetMetadata;
    const widgets = mergeLayouts(metadata.widgets);

    return NextResponse.json({ widgets });
  } catch (error) {
    logger.error("Failed to fetch widgets", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to fetch widgets" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});

export const POST = withRateLimit(async function POST(request: Request) {
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

    const layout = normalizeLayout(parsed.data.layout);
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
    logger.error("Failed to save widgets", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Failed to save widgets" },
      { status: 500 }
    );
  }
}, {"maxRequests": 60,"windowMs": 60000});