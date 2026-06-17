import {
  addDays,
  addMonths,
  addWeeks,
  startOfMinute,
  isAfter,
  isBefore,
} from "date-fns";
import type { Notification } from "@/generated/prisma/client";

export type ReminderRepeat = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";

export interface ReminderMeta {
  scheduledAt: string;
  repeat: ReminderRepeat;
  active: boolean;
  lastSentAt?: string;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  message: string;
  scheduledAt: Date;
  repeat: ReminderRepeat;
  active: boolean;
  read: boolean;
  lastSentAt: Date | null;
  createdAt: Date;
}

const REMINDER_PREFIX = "rhynode-reminder:";

export function encodeReminderMeta(meta: ReminderMeta): string {
  return `${REMINDER_PREFIX}${JSON.stringify(meta)}`;
}

export function decodeReminderMeta(actionUrl: string | null): ReminderMeta | null {
  if (!actionUrl || !actionUrl.startsWith(REMINDER_PREFIX)) return null;
  try {
    const parsed = JSON.parse(actionUrl.slice(REMINDER_PREFIX.length)) as Partial<ReminderMeta>;
    if (!parsed.scheduledAt || !isValidRepeat(parsed.repeat)) return null;
    return {
      scheduledAt: parsed.scheduledAt,
      repeat: parsed.repeat,
      active: typeof parsed.active === "boolean" ? parsed.active : true,
      lastSentAt: parsed.lastSentAt,
    };
  } catch {
    return null;
  }
}

function isValidRepeat(value: unknown): value is ReminderRepeat {
  return value === "NONE" || value === "DAILY" || value === "WEEKLY" || value === "MONTHLY";
}

export function isReminder(notification: Pick<Notification, "type">): boolean {
  return notification.type === "REMINDER";
}

export function toReminder(notification: Notification): Reminder | null {
  const meta = decodeReminderMeta(notification.actionUrl);
  if (!meta) return null;
  return {
    id: notification.id,
    userId: notification.userId,
    title: notification.title,
    message: notification.body,
    scheduledAt: new Date(meta.scheduledAt),
    repeat: meta.repeat,
    active: meta.active,
    read: notification.read,
    lastSentAt: meta.lastSentAt ? new Date(meta.lastSentAt) : null,
    createdAt: notification.createdAt,
  };
}

export function repeatLabel(repeat: ReminderRepeat): string {
  switch (repeat) {
    case "DAILY":
      return "Diario";
    case "WEEKLY":
      return "Semanal";
    case "MONTHLY":
      return "Mensual";
    default:
      return "Una vez";
  }
}

export function computeNextDue(meta: ReminderMeta): Date | null {
  const base = new Date(meta.scheduledAt);
  const lastSent = meta.lastSentAt ? new Date(meta.lastSentAt) : null;
  const reference = lastSent && isAfter(lastSent, base) ? lastSent : base;

  switch (meta.repeat) {
    case "DAILY":
      return addDays(reference, 1);
    case "WEEKLY":
      return addWeeks(reference, 1);
    case "MONTHLY":
      return addMonths(reference, 1);
    default:
      return null;
  }
}

export function getNextOccurrence(reminder: Reminder): Date | null {
  return computeNextDue({
    scheduledAt: reminder.scheduledAt.toISOString(),
    repeat: reminder.repeat,
    active: reminder.active,
    lastSentAt: reminder.lastSentAt?.toISOString(),
  });
}

export function isReminderDue(reminder: Reminder, now = new Date()): boolean {
  if (!reminder.active) return false;
  const next = getNextOccurrence(reminder);
  if (next) return isBefore(startOfMinute(next), startOfMinute(now)) || isSameMinute(next, now);
  return isBefore(startOfMinute(reminder.scheduledAt), startOfMinute(now)) || isSameMinute(reminder.scheduledAt, now);
}

function isSameMinute(a: Date, b: Date): boolean {
  return a.getTime() - (a.getTime() % 60000) === b.getTime() - (b.getTime() % 60000);
}

export function buildReminderPayload(reminder: Reminder): {
  title: string;
  body: string;
  actionUrl: string;
} {
  return {
    title: reminder.title,
    body: reminder.message,
    actionUrl: `/dashboard/personal/reminders?reminder=${reminder.id}`,
  };
}
