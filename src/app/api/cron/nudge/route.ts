import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { checkins, pushSubscriptions, users } from "@/lib/db/schema";
import { nowMinutesInTz, prevDay, todaySG } from "@/lib/date";
import { sendToUser, type PushPayload } from "@/lib/push";

// web-push needs the Node crypto APIs, and this must never be statically cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Width of the match window (minutes). An external pinger hits this endpoint every
// 30 min; we fire when "now" is within the 30-min slot that begins at the user's
// chosen reminder time. lastNudgedDay makes it idempotent, so pinger jitter (a late
// or doubled tick) can never send twice in a day.
const SLOT = 30;

/**
 * Per-user daily nudge. Triggered by a free external scheduler (e.g. cron-job.org)
 * every 30 minutes — NOT Vercel Cron. Each hit: for every user who set a reminder
 * time, has a subscribed device, hasn't checked in today, and hasn't been nudged
 * today, send a push IF it's currently their chosen 30-min slot in their own tz.
 */
export async function GET(req: Request) {
  // Reject anything without the shared secret (the pinger sends it as a bearer).
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const today = todaySG();
  const yesterday = prevDay(today);

  // Candidates: users with a reminder time set who have at least one device.
  const subbedIds = (
    await db.selectDistinct({ userId: pushSubscriptions.userId }).from(pushSubscriptions)
  ).map((r) => r.userId);
  if (subbedIds.length === 0) {
    return NextResponse.json({ ok: true, candidates: 0, nudged: 0 });
  }

  const candidates = await db
    .select({
      id: users.id,
      reminderMinute: users.reminderMinute,
      timezone: users.timezone,
      lastNudgedDay: users.lastNudgedDay,
    })
    .from(users)
    .where(inArray(users.id, subbedIds));

  const now = new Date();
  let nudged = 0;

  for (const u of candidates) {
    if (u.reminderMinute == null) continue; // no time set
    if (u.lastNudgedDay === today) continue; // already nudged today

    // Is it currently their slot (in their own timezone)?
    const localNow = nowMinutesInTz(u.timezone, now);
    const delta = localNow - u.reminderMinute;
    if (delta < 0 || delta >= SLOT) continue;

    // Already checked in today? (checkins.day is group-TZ per schema.) Then skip.
    const done = await db
      .select({ id: checkins.id })
      .from(checkins)
      .where(and(eq(checkins.userId, u.id), eq(checkins.day, today)))
      .limit(1);
    if (done.length > 0) continue;

    // Streak alive but at risk if they checked in yesterday → stronger wording.
    const ydayRow = await db
      .select({ id: checkins.id })
      .from(checkins)
      .where(and(eq(checkins.userId, u.id), eq(checkins.day, yesterday)))
      .limit(1);
    const streakAtRisk = ydayRow.length > 0;

    const payload: PushPayload = streakAtRisk
      ? {
          title: "Your streak needs you 🌱",
          body: "You checked in yesterday — a quick check-in keeps it alive.",
          url: "/#checkin",
          tag: "verdant-nudge",
        }
      : {
          title: "Time to check in 🍂",
          body: "Log today's effort before the day slips away.",
          url: "/#checkin",
          tag: "verdant-nudge",
        };

    const sent = await sendToUser(u.id, payload);
    if (sent > 0) {
      // Mark nudged even if 0 devices accepted? No — only when something sent, so a
      // transient failure can retry on the next tick within the same slot.
      await db.update(users).set({ lastNudgedDay: today }).where(eq(users.id, u.id));
      nudged++;
    }
  }

  return NextResponse.json({ ok: true, candidates: candidates.length, nudged });
}
