import { startOfDay } from "date-fns";

/**
 * Pure decision predicates for push notification thresholds.
 *
 * Extracted from src/lib/push-events.ts so the threshold math (which decides
 * whether a user gets alerted about budgets / goals / subscriptions / overdue
 * invoices) is unit-testable without mocking Prisma. The push-events functions
 * keep their behavior; they now delegate the decisions here.
 */

export const BUDGET_ALERT_RATIO = 0.8;
export const GOAL_75_THRESHOLD = 0.75;
export const GOAL_100_THRESHOLD = 1;
export const SUBSCRIPTION_REMINDER_WINDOW_DAYS = 7;

export interface ThresholdResult {
  /** Whether the alert condition is met. */
  met: boolean;
  /** Percentage of progress / usage, rounded. 0 when not met or undefined input. */
  percentage: number;
}

/** Budget alert fires at >= 80% usage. amount must be positive. */
export function budgetAlertStatus(amount: number, spent: number): ThresholdResult {
  if (amount <= 0) return { met: false, percentage: 0 };
  const ratio = spent / amount;
  if (ratio < BUDGET_ALERT_RATIO) return { met: false, percentage: 0 };
  return { met: true, percentage: Math.round(ratio * 100) };
}

/** Goal progress alert fires at the given threshold (0.75 or 1). */
export function goalAlertStatus(
  target: number,
  current: number,
  threshold: number,
): ThresholdResult {
  if (target <= 0) return { met: false, percentage: 0 };
  const ratio = current / target;
  if (ratio < threshold) return { met: false, percentage: 0 };
  return { met: true, percentage: Math.round(ratio * 100) };
}

/** Whole days from `now` to `nextDue`, using start-of-day boundaries. */
export function daysUntilDue(nextDue: Date, now: Date = new Date()): number {
  return Math.ceil(
    (startOfDay(nextDue).getTime() - startOfDay(now).getTime()) /
      (1000 * 60 * 60 * 24),
  );
}

/** Subscription reminder fires when due in 0..7 days (inclusive). */
export function subscriptionReminderDue(
  nextDue: Date,
  now: Date = new Date(),
): boolean {
  const days = daysUntilDue(nextDue, now);
  return days >= 0 && days <= SUBSCRIPTION_REMINDER_WINDOW_DAYS;
}

/** Days an invoice is overdue (>= 1 means overdue enough to remind). */
export function daysOverdue(dueDate: Date, now: Date = new Date()): number {
  return Math.floor(
    (startOfDay(now).getTime() - startOfDay(dueDate).getTime()) /
      (1000 * 60 * 60 * 24),
  );
}