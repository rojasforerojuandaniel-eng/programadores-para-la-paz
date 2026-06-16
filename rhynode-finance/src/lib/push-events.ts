import { addDays, startOfDay } from "date-fns";
import { getPrisma } from "./prisma";
import { sendPushNotification, type PushPayload } from "./notifications";
import { decimalToNumber } from "./decimal";
import { logger } from "./logger";
import type { Budget, Goal, RecurringTransaction, Invoice } from "@/generated/prisma/client";

type SendResult = { sent: number; errors: number; skipped: boolean };

const DEFAULT_ACTIONS = [
  { action: "view", title: "Ver" },
  { action: "dismiss", title: "Descartar" },
];

const INVOICE_ACTIONS = [
  { action: "view", title: "Ver" },
  { action: "pay", title: "Marcar pagado" },
  { action: "dismiss", title: "Descartar" },
];

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

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
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

  return { sent, errors, skipped: false };
}

export async function sendBudgetAlert(
  userId: string,
  budget: Budget
): Promise<SendResult> {
  const amount = decimalToNumber(budget.amount);
  const spent = decimalToNumber(budget.spent);
  if (amount <= 0 || spent / amount < 0.8) {
    return { sent: 0, errors: 0, skipped: true };
  }

  const percentage = Math.round((spent / amount) * 100);
  const actionUrl = `/dashboard/personal?budget=${budget.id}`;

  return notifyOnce(
    userId,
    "BUDGET_80",
    actionUrl,
    budget.startDate,
    {
      title: "Alerta de presupuesto",
      body: `Has usado ${percentage}% de tu presupuesto "${budget.name}".`,
      tag: `budget-${budget.id}`,
      url: actionUrl,
      actions: DEFAULT_ACTIONS,
    }
  );
}

export async function sendGoalProgressAlert(
  userId: string,
  goal: Goal,
  threshold: 0.75 | 1
): Promise<SendResult> {
  const target = decimalToNumber(goal.targetAmount);
  const current = decimalToNumber(goal.currentAmount);
  if (target <= 0 || current / target < threshold) {
    return { sent: 0, errors: 0, skipped: true };
  }

  const percentage = Math.round((current / target) * 100);
  const suffix = threshold === 1 ? "GOAL_100" : "GOAL_75";
  const label = threshold === 1 ? "completada" : `al ${Math.round(threshold * 100)}%`;
  const actionUrl = `/dashboard/personal?goal=${goal.id}`;

  return notifyOnce(
    userId,
    suffix,
    actionUrl,
    goal.createdAt,
    {
      title: threshold === 1 ? "Meta alcanzada" : "Vas por buen camino",
      body: `Tu meta "${goal.name}" está ${label}: ${percentage}% ahorrado.`,
      tag: `goal-${goal.id}-${suffix}`,
      url: actionUrl,
      actions: DEFAULT_ACTIONS,
    }
  );
}

export async function sendSubscriptionReminder(
  userId: string,
  sub: RecurringTransaction
): Promise<SendResult> {
  if (!sub.isSubscription || sub.status !== "ACTIVE") {
    return { sent: 0, errors: 0, skipped: true };
  }

  const now = new Date();
  const nextDue = sub.nextDueDate;
  const daysUntil = Math.ceil((startOfDay(nextDue).getTime() - startOfDay(now).getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0 || daysUntil > 7) {
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
      title: "Suscripción próxima a vencer",
      body: `"${sub.name}" vence el ${nextDue.toLocaleDateString("es-CO")}.`,
      tag: `subscription-${sub.id}-${dueKey}`,
      url: actionUrl,
      actions: DEFAULT_ACTIONS,
    }
  );
}

export async function sendInvoiceOverdueReminder(
  invoice: Invoice,
  organizationUserId: string | null | undefined
): Promise<SendResult> {
  if (!organizationUserId || !invoice.dueDate) {
    return { sent: 0, errors: 0, skipped: true };
  }

  const now = new Date();
  const due = invoice.dueDate;
  const daysOverdue = Math.floor(
    (startOfDay(now).getTime() - startOfDay(due).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysOverdue < 1) {
    return { sent: 0, errors: 0, skipped: true };
  }

  const reminder = daysOverdue >= 3 ? "3d" : "1d";
  const suffix = reminder === "3d" ? "INVOICE_OVERDUE_3D" : "INVOICE_OVERDUE_1D";
  const body = reminder === "3d"
    ? `La factura ${invoice.number} lleva más de 3 días vencida. Revisa el cobro.`
    : `La factura ${invoice.number} venció ayer. No olvides hacer seguimiento.`;

  const actionUrl = `/dashboard/invoices?id=${invoice.id}&reminder=${reminder}`;

  return notifyOnce(
    organizationUserId,
    suffix,
    actionUrl,
    due,
    {
      title: "Factura vencida",
      body,
      tag: `invoice-${invoice.id}-${suffix}`,
      url: `/dashboard/invoices?id=${invoice.id}`,
      actionUrl,
      actions: INVOICE_ACTIONS,
    }
  );
}

export async function checkAndNotifyBudgetThreshold(
  userId: string,
  budgetId: string
): Promise<SendResult> {
  try {
    const prisma = getPrisma();
    const budget = await prisma.budget.findUnique({ where: { id: budgetId } });
    if (!budget || budget.userId !== userId) return { sent: 0, errors: 0, skipped: true };
    return sendBudgetAlert(userId, budget);
  } catch (error) {
    logger.error("checkAndNotifyBudgetThreshold failed", { error: error instanceof Error ? error.message : String(error) });
    return { sent: 0, errors: 1, skipped: false };
  }
}

export async function checkAndNotifyGoalThresholds(
  userId: string,
  goalId: string
): Promise<{ results: SendResult[] }> {
  try {
    const prisma = getPrisma();
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== userId) return { results: [] };
    const results = await Promise.all([
      sendGoalProgressAlert(userId, goal, 0.75),
      sendGoalProgressAlert(userId, goal, 1),
    ]);
    return { results };
  } catch (error) {
    logger.error("checkAndNotifyGoalThresholds failed", { error: error instanceof Error ? error.message : String(error) });
    return { results: [] };
  }
}

export async function checkAndNotifySubscriptionReminder(
  userId: string,
  recurringId: string
): Promise<SendResult> {
  try {
    const prisma = getPrisma();
    const sub = await prisma.recurringTransaction.findUnique({ where: { id: recurringId } });
    if (!sub || sub.userId !== userId) return { sent: 0, errors: 0, skipped: true };
    return sendSubscriptionReminder(userId, sub);
  } catch (error) {
    logger.error("checkAndNotifySubscriptionReminder failed", { error: error instanceof Error ? error.message : String(error) });
    return { sent: 0, errors: 1, skipped: false };
  }
}
