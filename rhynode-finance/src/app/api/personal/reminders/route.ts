import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { logger } from "@/lib/logger";
import {
  encodeReminderMeta,
  toReminder,
  type ReminderRepeat,
} from "@/lib/reminders";

const repeatEnum: [ReminderRepeat, ...ReminderRepeat[]] = ["NONE", "DAILY", "WEEKLY", "MONTHLY"];

const createSchema = z.object({
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(500),
  scheduledAt: z.string().datetime(),
  repeat: z.enum(repeatEnum).default("NONE"),
});

export const GET = withRateLimit(
  async () => {
    try {
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const prisma = getPrisma();
      const notifications = await prisma.notification.findMany({
        where: { userId: profile.id, type: "REMINDER" },
        orderBy: { createdAt: "desc" },
      });

      const reminders = notifications.map(toReminder).filter((r): r is NonNullable<typeof r> => r !== null);
      return NextResponse.json({ reminders });
    } catch (error) {
      logger.error("Failed to fetch reminders", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to fetch reminders" },
        { status: 500 }
      );
    }
  },
  { key: "reminders-read", maxRequests: 60, windowMs: 60000 }
);

export const POST = withRateLimit(
  async (request: Request) => {
    try {
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body: unknown = await request.json();
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const { title, message, scheduledAt, repeat } = parsed.data;
      const prisma = getPrisma();
      const notification = await prisma.notification.create({
        data: {
          userId: profile.id,
          type: "REMINDER",
          title,
          body: message,
          actionUrl: encodeReminderMeta({
            scheduledAt,
            repeat,
            active: true,
          }),
        },
      });

      const reminder = toReminder(notification);
      return NextResponse.json({ reminder });
    } catch (error) {
      logger.error("Failed to create reminder", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to create reminder" },
        { status: 500 }
      );
    }
  },
  { key: "reminders-write", maxRequests: 20, windowMs: 60000 }
);
