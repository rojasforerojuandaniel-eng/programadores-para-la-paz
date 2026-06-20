import { describe, it, expect } from "vitest";
import {
  budgetAlertStatus,
  daysOverdue,
  daysUntilDue,
  goalAlertStatus,
  subscriptionReminderDue,
} from "@/lib/push-thresholds";

const NOW = new Date("2026-06-19T12:00:00.000Z");

describe("budgetAlertStatus", () => {
  it("does not alert below 80% usage", () => {
    expect(budgetAlertStatus(100000, 79000)).toEqual({ met: false, percentage: 0 });
  });

  it("alerts at exactly 80%", () => {
    expect(budgetAlertStatus(100000, 80000)).toEqual({ met: true, percentage: 80 });
  });

  it("alerts above 80% and rounds the percentage", () => {
    expect(budgetAlertStatus(100000, 83333)).toEqual({ met: true, percentage: 83 });
  });

  it("never alerts when budget is zero or negative", () => {
    expect(budgetAlertStatus(0, 5000).met).toBe(false);
    expect(budgetAlertStatus(-100, 5000).met).toBe(false);
  });
});

describe("goalAlertStatus", () => {
  it("does not alert below the 0.75 threshold", () => {
    expect(goalAlertStatus(100000, 74000, 0.75).met).toBe(false);
  });

  it("alerts at 75% for the 0.75 threshold", () => {
    expect(goalAlertStatus(100000, 75000, 0.75)).toEqual({ met: true, percentage: 75 });
  });

  it("does not alert below 100% for the completion threshold", () => {
    expect(goalAlertStatus(100000, 99000, 1).met).toBe(false);
  });

  it("alerts at exactly 100% for completion", () => {
    expect(goalAlertStatus(100000, 100000, 1)).toEqual({ met: true, percentage: 100 });
  });

  it("never alerts when target is zero or negative", () => {
    expect(goalAlertStatus(0, 1000, 0.75).met).toBe(false);
  });
});

describe("daysUntilDue / subscriptionReminderDue", () => {
  it("counts 0 days when due today", () => {
    expect(daysUntilDue(new Date("2026-06-19T08:00:00.000Z"), NOW)).toBe(0);
  });

  it("counts whole days using start-of-day boundaries", () => {
    expect(daysUntilDue(new Date("2026-06-26T08:00:00.000Z"), NOW)).toBe(7);
  });

  it("is negative for an overdue date", () => {
    expect(daysUntilDue(new Date("2026-06-17T08:00:00.000Z"), NOW)).toBeLessThan(0);
  });

  it("reminds when due within the 0..7 day window", () => {
    expect(subscriptionReminderDue(new Date("2026-06-19T08:00:00.000Z"), NOW)).toBe(true);
    expect(subscriptionReminderDue(new Date("2026-06-26T08:00:00.000Z"), NOW)).toBe(true);
  });

  it("does not remind when already overdue or more than 7 days out", () => {
    expect(subscriptionReminderDue(new Date("2026-06-17T08:00:00.000Z"), NOW)).toBe(false);
    expect(subscriptionReminderDue(new Date("2026-06-27T08:00:00.000Z"), NOW)).toBe(false);
  });
});

describe("daysOverdue", () => {
  it("is negative for a not-yet-due invoice (not overdue)", () => {
    expect(daysOverdue(new Date("2026-06-20T08:00:00.000Z"), NOW)).toBeLessThan(0);
  });

  it("is 1 the day after the due date", () => {
    expect(daysOverdue(new Date("2026-06-18T08:00:00.000Z"), NOW)).toBe(1);
  });

  it("reaches 3 days for the 3d reminder tier", () => {
    expect(daysOverdue(new Date("2026-06-16T08:00:00.000Z"), NOW)).toBe(3);
  });
});