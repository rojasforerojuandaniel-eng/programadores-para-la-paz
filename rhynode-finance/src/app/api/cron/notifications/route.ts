import { decimalToNumber } from "@/lib/decimal";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/notifications";
import { addDays, startOfDay, endOfDay } from "date-fns";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();
    const threeDaysLater = addDays(now, 3);

    const results = {
      budgetAlerts: 0,
      subscriptionReminders: 0,
      totalSent: 0,
      errors: 0,
    };

    // Fetch all push subscriptions with their users and notification preferences
    const allSubscriptions = await prisma.pushSubscription.findMany({
      include: {
        user: {
          include: {
            notificationPreference: true,
            budgets: true,
            recurringTransactions: {
              where: {
                isSubscription: true,
                status: "ACTIVE",
                nextDueDate: {
                  gte: startOfDay(now),
                  lte: endOfDay(threeDaysLater),
                },
              },
            },
          },
        },
      },
    });

    for (const pushSub of allSubscriptions) {
      const user = pushSub.user;
      if (!user) continue;

      const prefs = user.notificationPreference;
      const budgetsEnabled = prefs ? prefs.budgets : true;
      const subscriptionsEnabled = prefs ? prefs.subscriptions : true;

      // Budget alerts
      if (budgetsEnabled) {
        for (const budget of user.budgets) {
          const budgetAmount = decimalToNumber(budget.amount);
          const budgetSpent = decimalToNumber(budget.spent);
          if (budgetAmount > 0 && budgetSpent / budgetAmount >= 0.8) {
            const res = await sendPushNotification(
              {
                endpoint: pushSub.endpoint,
                p256dh: pushSub.p256dh,
                auth: pushSub.auth,
              },
              {
                title: "Alerta de Presupuesto",
                body: `Has usado ${Math.round((budgetSpent / budgetAmount) * 100)}% de tu presupuesto "${budget.name}".`,
                tag: `budget-${budget.id}`,
                url: "/dashboard/personal",
              }
            );
            if (res.success) {
              results.budgetAlerts++;
              results.totalSent++;
            } else {
              results.errors++;
            }
          }
        }
      }

      // Subscription reminders
      if (subscriptionsEnabled) {
        for (const sub of user.recurringTransactions) {
          const res = await sendPushNotification(
            {
              endpoint: pushSub.endpoint,
              p256dh: pushSub.p256dh,
              auth: pushSub.auth,
            },
            {
              title: "Recordatorio de Suscripción",
              body: `"${sub.name}" vence el ${sub.nextDueDate.toLocaleDateString("es-CO")}.`,
              tag: `subscription-${sub.id}`,
              url: "/dashboard/personal",
            }
          );
          if (res.success) {
            results.subscriptionReminders++;
            results.totalSent++;
          } else {
            results.errors++;
          }
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