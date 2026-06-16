import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { addDays, startOfDay } from "date-fns";
import {
  sendBudgetAlert,
  sendGoalProgressAlert,
  sendSubscriptionReminder,
  sendInvoiceOverdueReminder,
} from "@/lib/push-events";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();
    const prisma = getPrisma();

    const results = {
      budgetAlerts: 0,
      goalAlerts: 0,
      subscriptionReminders: 0,
      invoiceOverdueReminders: 0,
      totalSent: 0,
      totalErrors: 0,
    };

    // Unique users with at least one push subscription
    const subs = await prisma.pushSubscription.findMany({
      include: {
        user: {
          include: {
            notificationPreference: true,
          },
        },
      },
    });

    const userIds = Array.from(new Set(subs.map((s) => s.userId)));

    for (const userId of userIds) {
      const user = subs.find((s) => s.userId === userId)?.user;
      if (!user) continue;

      const prefs = user.notificationPreference;
      const budgetsEnabled = prefs ? prefs.budgets : true;
      const subscriptionsEnabled = prefs ? prefs.subscriptions : true;

      if (budgetsEnabled) {
        const budgets = await prisma.budget.findMany({ where: { userId } });
        for (const budget of budgets) {
          const res = await sendBudgetAlert(userId, budget);
          if (!res.skipped) {
            results.budgetAlerts++;
            results.totalSent += res.sent;
            results.totalErrors += res.errors;
          }
        }
      }

      const goals = await prisma.goal.findMany({ where: { userId } });
      for (const goal of goals) {
        for (const threshold of [0.75, 1] as const) {
          const res = await sendGoalProgressAlert(userId, goal, threshold);
          if (!res.skipped) {
            results.goalAlerts++;
            results.totalSent += res.sent;
            results.totalErrors += res.errors;
          }
        }
      }

      if (subscriptionsEnabled) {
        const recurring = await prisma.recurringTransaction.findMany({
          where: {
            userId,
            isSubscription: true,
            status: "ACTIVE",
            nextDueDate: {
              gte: startOfDay(now),
              lte: endOfDay(addDays(now, 7)),
            },
          },
        });
        for (const sub of recurring) {
          const res = await sendSubscriptionReminder(userId, sub);
          if (!res.skipped) {
            results.subscriptionReminders++;
            results.totalSent += res.sent;
            results.totalErrors += res.errors;
          }
        }
      }

      const overdueInvoices = await prisma.invoice.findMany({
        where: {
          status: "OVERDUE",
          dueDate: { lt: addDays(startOfDay(now), -1) },
          organization: { userId },
        },
      });
      for (const invoice of overdueInvoices) {
        const res = await sendInvoiceOverdueReminder(invoice, userId);
        if (!res.skipped) {
          results.invoiceOverdueReminders++;
          results.totalSent += res.sent;
          results.totalErrors += res.errors;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      ...results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    logger.error("Cron notifications failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
