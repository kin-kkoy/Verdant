import "server-only";
import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { pushSubscriptions } from "./db/schema";

// Server-side Web Push sender. Not a server action — imported by the cron route
// (and any future server code that needs to notify a user). Client code talks to
// push via the `savePushSubscription` / `deletePushSubscription` actions instead.

let configured = false;
function configure() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:you@example.com";
  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set. Run `npm run vapid` and add them to your env.",
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Send a notification to every device a user has subscribed. Returns how many
 * pushes were accepted. Expired subscriptions (404/410) are pruned automatically.
 */
export async function sendToUser(userId: number, payload: PushPayload): Promise<number> {
  configure();
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.authKey } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        // Subscription is gone (user cleared data / uninstalled) — prune it.
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
      } else {
        console.error(`push send failed for user ${userId} (status ${status ?? "?"})`, err);
      }
    }
  }
  return sent;
}
