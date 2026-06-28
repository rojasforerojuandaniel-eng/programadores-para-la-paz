import webpush from "web-push";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { getPrisma } from "./prisma";
import { logger } from "./logger";

// The public key MUST match the one the browser subscribed with. The client
// (src/lib/push.ts) subscribes using NEXT_PUBLIC_VAPID_PUBLIC_KEY, so the server
// must use the same value — not a separate VAPID_PUBLIC_KEY that may be unset.
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:contacto@rhynode.finance",
    vapidPublicKey,
    vapidPrivateKey
  );
}

const expoClient = new Expo();

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  actionUrl?: string;
  requireInteraction?: boolean;
  renotify?: boolean;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

export async function sendPushNotification(
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );

    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    // Remove invalid subscriptions
    if (errMsg.includes("expired") || errMsg.includes("unregistered") || errMsg.includes("Invalid")) {
      const prisma = getPrisma();
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: subscription.endpoint },
      });
    }
    return { success: false, error: errMsg };
  }
}

export interface ExpoPushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendExpoPushNotification(
  tokens: string[],
  payload: ExpoPushPayload
): Promise<{ sent: number; errors: number }> {
  const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));
  if (validTokens.length === 0) {
    return { sent: 0, errors: 0 };
  }

  const messages: ExpoPushMessage[] = validTokens.map((to) => ({
    to,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data,
  }));

  const chunks = expoClient.chunkPushNotifications(messages);
  let sent = 0;
  let errors = 0;

  for (const chunk of chunks) {
    try {
      const tickets = await expoClient.sendPushNotificationsAsync(chunk);
      for (const ticket of tickets) {
        if (ticket.status === "error") {
          errors++;
          logger.error("Expo push ticket error", {
            message: ticket.message,
            details: ticket.details,
          });
        } else {
          sent++;
        }
      }
    } catch (error) {
      errors += chunk.length;
      logger.error("Expo push chunk failed", { error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { sent, errors };
}
