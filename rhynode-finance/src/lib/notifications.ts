import webpush from "web-push";
import { getPrisma } from "./prisma";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:contacto@rhynode.finance",
    vapidPublicKey,
    vapidPrivateKey
  );
}

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
