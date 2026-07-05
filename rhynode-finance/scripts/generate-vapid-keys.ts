/* eslint-disable no-console -- CLI script. */
import webpush from "web-push";

/**
 * Generates a VAPID key pair for web push notifications.
 *
 * Run with: npx tsx scripts/generate-vapid-keys.ts
 *
 * Copy the printed values into your environment:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY  -> exposed to the browser (used by src/lib/push.ts)
 *   VAPID_PRIVATE_KEY             -> server-only (used by src/lib/notifications.ts)
 *
 * Both the client subscription and the server send MUST use the same key pair,
 * so set these once and reuse across environments. Never commit the private key.
 */
const keys = webpush.generateVAPIDKeys();

console.log("VAPID key pair generated.\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}\n`);
console.log("Add both to .env.local and to your Vercel project env vars.");