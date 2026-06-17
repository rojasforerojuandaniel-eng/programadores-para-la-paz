import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { logger } from "@/lib/logger";
import {
  decodeReminderMeta,
  encodeReminderMeta,
  toReminder,
  type ReminderRepeat,
} from "@/lib/reminders";

const repeatEnum: [ReminderRepeat, ...ReminderRepeat[]] = ["NONE", "DAILY", "WEEKLY", "MONTHLY"];

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  message: z.string().min(1).max(500).optional(),
  scheduledAt: z.string().datetime().optional(),
  repeat: z.enum(repeatEnum).optional(),
  active: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getReminder(profileId: string, id: string) {
  const prisma = getPrisma();
  const notification = await prisma.notification.findFirst({
    where: { id, userId: profileId, type: "REMINDER" },
  });
  if (!notification) return null;
  return toReminder(notification);
}

export const PATCH = withRateLimit(
  async (request: Request, context?: RouteContext) => {
    if (!context) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    try {
      const { id } = await context.params;
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const reminder = await getReminder(profile.id, id);
      if (!reminder) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const body: unknown = await request.json();
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const updates = parsed.data;
      const meta = decodeReminderMeta(
        encodeReminderMeta({
          scheduledAt: reminder.scheduledAt.toISOString(),
          repeat: reminder.repeat,
          active: reminder.active,
          lastSentAt: reminder.lastSentAt?.toISOString(),
        })
      ) ?? { scheduledAt: reminder.scheduledAt.toISOString(), repeat: reminder.repeat, active: reminder.active };

      if (updates.scheduledAt !== undefined) meta.scheduledAt = updates.scheduledAt;
      if (updates.repeat !== undefined) meta.repeat = updates.repeat;
      if (updates.active !== undefined) meta.active = updates.active;

      const prisma = getPrisma();
      const notification = await prisma.notification.update({
        where: { id },
        data: {
          title: updates.title ?? reminder.title,
          body: updates.message ?? reminder.message,
          actionUrl: encodeReminderMeta(meta),
        },
      });

      return NextResponse.json({ reminder: toReminder(notification) });
    } catch (error) {
      logger.error("Failed to update reminder", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to update reminder" },
        { status: 500 }
      );
    }
  },
  { key: "reminders-write", maxRequests: 20, windowMs: 60000 }
);

export const DELETE = withRateLimit(
  async (_request: Request, context?: RouteContext) => {
    if (!context) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    try {
      const { id } = await context.params;
      const profile = await getUserProfile();
      if (!profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const prisma = getPrisma();
      const { count } = await prisma.notification.deleteMany({
        where: { id, userId: profile.id, type: "REMINDER" },
      });

      if (count === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error("Failed to delete reminder", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to delete reminder" },
        { status: 500 }
      );
    }
  },
  { key: "reminders-write", maxRequests: 20, windowMs: 60000 }
);
