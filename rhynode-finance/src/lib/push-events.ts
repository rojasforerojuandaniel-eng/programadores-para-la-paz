import { addDays, startOfDay } from "date-fns";
import { getPrisma } from "./prisma";
import { sendPushNotification, sendExpoPushNotification, type PushPayload } from "./notifications";
import { decimalToNumber } from "./decimal";
import { logger } from "./logger";
import {
  budgetAlertStatus,
  daysOverdue,
  goalAlertStatus,
  subscriptionReminderDue,
} from "./push-thresholds";
import { formatDate as fmtDate } from "./format";
import type { Locale } from "./locale";
import type { Budget, Goal, RecurringTransaction, Invoice } from "@/generated/prisma/client";

type SendResult = { sent: number; errors: number; skipped: boolean };

function buildActions(locale: Locale) {
  if (locale === "en") {
    return {
      default: [
        { action: "view", title: "View" },
        { action: "dismiss", title: "Dismiss" },
      ],
      invoice: [
        { action: "view", title: "View" },
        { action: "pay", title: "Mark paid" },
        { action: "dismiss", title: "Dismiss" },
      ],
    };
  }
  return {
    default: [
      { action: "view", title: "Ver" },
      { action: "dismiss", title: "Descartar" },
    ],
    invoice: [
      { action: "view", title: "Ver" },
      { action: "pay", title: "Marcar pagado" },
      { action: "dismiss", title: "Descartar" },
    ],
  };
}

async function hasRecentNotification(
  userId: string,
  type: string,
  actionUrl: string,
  windowStart: Date
): Promise<boolean> {
  const prisma = getPrisma();
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      type,
      actionUrl,
      createdAt: { gte: windowStart },
    },
  });
  return !!existing;
}

async function notifyOnce(
  userId: string,
  type: string,
  actionUrl: string,
  windowStart: Date,
  payload: PushPayload
): Promise<SendResult> {
  if (await hasRecentNotification(userId, type, actionUrl, windowStart)) {
    return { sent: 0, errors: 0, skipped: true };
  }

  const prisma = getPrisma();
  await prisma.notification.create({
    data: {
      userId,
      type,
      title: payload.title,
      body: payload.body,
      actionUrl,
    },
  });

  const [subs, expoTokens] = await Promise.all([
    prisma.pushSubscription.findMany({ where: { userId } }),
    prisma.expoPushToken.findMany({ where: { userId }, select: { token: true } }),
  ]);
  let sent = 0;
  let errors = 0;

  for (const sub of subs) {
    const res = await sendPushNotification(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      payload
    );
    if (res.success) {
      sent++;
    } else {
      errors++;
    }
  }

  if (expoTokens.length > 0) {
    const expoResult = await sendExpoPushNotification(
      expoTokens.map((t) => t.token),
      {
        title: payload.title,
        body: payload.body,
        data: payload.url ? { url: payload.url } : undefined,
      }
    );
    sent += expoResult.sent;
    errors += expoResult.errors;
  }

  return { sent, errors, skipped: false };
}

export async function sendBudgetAlert(
  userId: string,
  budget: Budget,
  locale: Locale = "es"
): Promise<SendResult> {
  const amount = decimalToNumber(budget.amount);
  const spent = decimalToNumber(budget.spent);
  const status = budgetAlertStatus(amount, spent);
  if (!status.met) {
    return { sent: 0, errors: 0, skipped: true };
  }

  const percentage = status.percentage;
  const actionUrl = `/dashboard/personal?budget=${budget.id}`;

  return notifyOnce(
    userId,
    "BUDGET_80",
    actionUrl,
    budget.startDate,
    {
      title: locale === "en" ? "Budget alert" : "Alerta de presupuesto",
      body: locale === "en"
        ? `You've used ${percentage}% of your budget "${budget.name}".`
        : `Has usado ${percentage}% de tu presupuesto "${budget.name}".`,
      tag: `budget-${budget.id}`,
      url: actionUrl,
      actions: buildActions(locale).default,
    }
  );
}

export async function sendGoalProgressAlert(
  userId: string,
  goal: Goal,
  threshold: 0.75 | 1,
  locale: Locale = "es"
): Promise<SendResult> {
  const target = decimalToNumber(goal.targetAmount);
  const current = decimalToNumber(goal.currentAmount);
  const status = goalAlertStatus(target, current, threshold);
  if (!status.met) {
    return { sent: 0, errors: 0, skipped: true };
  }

  const percentage = status.percentage;
  const suffix = threshold === 1 ? "GOAL_100" : "GOAL_75";
  const label = locale === "en"
    ? threshold === 1 ? "complete" : `at ${Math.round(threshold * 100)}%`
    : threshold === 1 ? "completada" : `al ${Math.round(threshold * 100)}%`;
  const actionUrl = `/dashboard/personal?goal=${goal.id}`;

  return notifyOnce(
    userId,
    suffix,
    actionUrl,
    goal.createdAt,
    {
      title: threshold === 1
        ? (locale === "en" ? "Goal reached" : "Meta alcanzada")
        : (locale === "en" ? "You're on track" : "Vas por buen camino"),
      body: locale === "en"
        ? `Your goal "${goal.name}" is ${label}: ${percentage}% saved.`
        : `Tu meta "${goal.name}" está ${label}: ${percentage}% ahorrado.`,
      tag: `goal-${goal.id}-${suffix}`,
      url: actionUrl,
      actions: buildActions(locale).default,
    }
  );
}

export async function sendSubscriptionReminder(
  userId: string,
  sub: RecurringTransaction,
  locale: Locale = "es"
): Promise<SendResult> {
  if (!sub.isSubscription || sub.status !== "ACTIVE") {
    return { sent: 0, errors: 0, skipped: true };
  }

  const now = new Date();
  const nextDue = sub.nextDueDate;

  if (!subscriptionReminderDue(nextDue, now)) {
    return { sent: 0, errors: 0, skipped: true };
  }

  const dueKey = nextDue.toISOString().slice(0, 10);
  const actionUrl = `/dashboard/personal?subscription=${sub.id}&due=${dueKey}`;

  return notifyOnce(
    userId,
    "SUBSCRIPTION_7D",
    actionUrl,
    addDays(startOfDay(nextDue), -7),
    {
      title: locale === "en" ? "Subscription due soon" : "Suscripción próxima a vencer",
      body: locale === "en"
        ? `"${sub.name}" is due on ${fmtDate(nextDue, locale, { month: "short", day: "numeric" })}.`
        : `"${sub.name}" vence el ${fmtDate(nextDue, locale, { month: "short", day: "numeric" })}.`,
      tag: `subscription-${sub.id}-${dueKey}`,
      url: actionUrl,
      actions: buildActions(locale).default,
    }
  );
}

export async function sendInvoiceOverdueReminder(
  invoice: Invoice,
  organizationUserId: string | null | undefined,
  locale: Locale = "es"
): Promise<SendResult> {
  if (!organizationUserId || !invoice.dueDate) {
    return { sent: 0, errors: 0, skipped: true };
  }

  const now = new Date();
  const due = invoice.dueDate;
  const overdueDays = daysOverdue(due, now);

  if (overdueDays < 1) {
    return { sent: 0, errors: 0, skipped: true };
  }

  const reminder = overdueDays >= 3 ? "3d" : "1d";
  const suffix = reminder === "3d" ? "INVOICE_OVERDUE_3D" : "INVOICE_OVERDUE_1D";
  const body = reminder === "3d"
    ? (locale === "en"
      ? `Invoice ${invoice.number} is more than 3 days overdue. Follow up on the charge.`
      : `La factura ${invoice.number} lleva más de 3 días vencida. Revisa el cobro.`)
    : (locale === "en"
      ? `Invoice ${invoice.number} was due yesterday. Don't forget to follow up.`
      : `La factura ${invoice.number} venció ayer. No olvides hacer seguimiento.`);

  const actionUrl = `/dashboard/invoices?id=${invoice.id}&reminder=${reminder}`;

  return notifyOnce(
    organizationUserId,
    suffix,
    actionUrl,
    due,
    {
      title: locale === "en" ? "Overdue invoice" : "Factura vencida",
      body,
      tag: `invoice-${invoice.id}-${suffix}`,
      url: `/dashboard/invoices?id=${invoice.id}`,
      actionUrl,
      actions: buildActions(locale).invoice,
    }
  );
}

export async function checkAndNotifyBudgetThreshold(
  userId: string,
  budgetId: string,
  locale: Locale = "es"
): Promise<SendResult> {
  try {
    const prisma = getPrisma();
    const budget = await prisma.budget.findUnique({ where: { id: budgetId } });
    if (!budget || budget.userId !== userId) return { sent: 0, errors: 0, skipped: true };
    return sendBudgetAlert(userId, budget, locale);
  } catch (error) {
    logger.error("checkAndNotifyBudgetThreshold failed", { error: error instanceof Error ? error.message : String(error) });
    return { sent: 0, errors: 1, skipped: false };
  }
}

export async function checkAndNotifyGoalThresholds(
  userId: string,
  goalId: string,
  locale: Locale = "es"
): Promise<{ results: SendResult[] }> {
  try {
    const prisma = getPrisma();
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== userId) return { results: [] };
    const results = await Promise.all([
      sendGoalProgressAlert(userId, goal, 0.75, locale),
      sendGoalProgressAlert(userId, goal, 1, locale),
    ]);
    return { results };
  } catch (error) {
    logger.error("checkAndNotifyGoalThresholds failed", { error: error instanceof Error ? error.message : String(error) });
    return { results: [] };
  }
}

export async function checkAndNotifySubscriptionReminder(
  userId: string,
  recurringId: string,
  locale: Locale = "es"
): Promise<SendResult> {
  try {
    const prisma = getPrisma();
    const sub = await prisma.recurringTransaction.findUnique({ where: { id: recurringId } });
    if (!sub || sub.userId !== userId) return { sent: 0, errors: 0, skipped: true };
    return sendSubscriptionReminder(userId, sub, locale);
  } catch (error) {
    logger.error("checkAndNotifySubscriptionReminder failed", { error: error instanceof Error ? error.message : String(error) });
    return { sent: 0, errors: 1, skipped: false };
  }
}
