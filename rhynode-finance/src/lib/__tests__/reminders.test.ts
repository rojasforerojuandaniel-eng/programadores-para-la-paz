import { describe, it, expect } from "vitest";
import {
  encodeReminderMeta,
  decodeReminderMeta,
  isReminderDue,
  toReminder,
} from "@/lib/reminders";
import type { Notification } from "@/generated/prisma/client";

describe("encodeReminderMeta / decodeReminderMeta", () => {
  it("round-trips a reminder meta", () => {
    const meta = { scheduledAt: "2026-06-18T13:00:00.000Z", repeat: "NONE", active: true } as const;
    const encoded = encodeReminderMeta(meta);
    expect(encoded.startsWith("rhynode-reminder:")).toBe(true);
    expect(decodeReminderMeta(encoded)).toEqual(meta);
  });

  it("decode returns null for non-reminder actionUrls", () => {
    expect(decodeReminderMeta(null)).toBeNull();
    expect(decodeReminderMeta("/dashboard/advisor?reminder=2026-06-18")).toBeNull();
  });

  it("decode returns null for invalid repeat values", () => {
    const encoded = encodeReminderMeta({
      scheduledAt: "2026-06-18T13:00:00.000Z",
      repeat: "HOURLY" as never,
      active: true,
    });
    expect(decodeReminderMeta(encoded)).toBeNull();
  });
});

describe("create_reminder tool → isReminderDue chain", () => {
  // Mirrors handleCreateReminder: a dueDate is encoded as the notification
  // actionUrl so the cron can detect it is due. A raw dueDate string used to
  // break this chain (decodeReminderMeta returned null → never fired).
  it("a past dueDate encoded as actionUrl is detected as due", () => {
    const dueDate = "2020-01-01T00:00:00.000Z"; // clearly in the past
    const actionUrl = encodeReminderMeta({
      scheduledAt: dueDate,
      repeat: "NONE",
      active: true,
    });
    const notification = {
      id: "n1",
      userId: "u1",
      type: "REMINDER",
      title: "Pagar",
      body: "Pagar tarjeta",
      actionUrl,
    } as unknown as Notification;
    const reminder = toReminder(notification);
    expect(reminder).not.toBeNull();
    expect(isReminderDue(reminder as never)).toBe(true);
  });

  it("a future dueDate is not yet due", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const actionUrl = encodeReminderMeta({
      scheduledAt: future.toISOString(),
      repeat: "NONE",
      active: true,
    });
    const notification = {
      id: "n2",
      userId: "u1",
      type: "REMINDER",
      title: "Pagar",
      body: "Pagar tarjeta",
      actionUrl,
    } as unknown as Notification;
    const reminder = toReminder(notification);
    expect(reminder).not.toBeNull();
    expect(isReminderDue(reminder as never)).toBe(false);
  });
});