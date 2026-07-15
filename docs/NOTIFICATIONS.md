# Verdant — PWA & Notifications

_How the installable app + daily reminder notifications work, and how to switch them on._

Verdant ships as a **PWA** (Progressive Web App): installable to an Android home screen,
fast (offline app-shell cache), and able to send **push notifications** — all reusing the
existing Next.js server. No native app, no Play Store, nothing per-host beyond env vars.

Built in two chunks:

- **Chunk A — installable shell.** `src/app/manifest.ts`, maskable icons
  (`src/app/icon-maskable.svg` → `scripts/generate-icons.mjs`, `npm run icons`, PNGs committed),
  an auth-safe service worker (`public/sw.js`: network-first navigations so authenticated pages
  are never stale, cache-first static assets, `/api/*` + all POSTs bypassed), `public/offline.html`,
  and `src/components/ServiceWorkerRegister.tsx` (registers in production only).
- **Chunk B — reminders.** Web Push with a **per-user reminder time** (30-min granularity,
  in each user's own timezone).

---

## How reminders work

- A user taps **Enable** on the home check-in card. The browser grants permission, subscribes,
  and we store the subscription (`push_subscriptions`) plus the user's reminder time + phone
  timezone (`users.reminderMinute` / `users.timezone`).
- A **30-minute pinger** (see below) hits `GET /api/cron/nudge`. For each subscribed user, it
  fires a push **only** when the current time in *their* timezone is inside the 30-min slot
  starting at their chosen time, they haven't checked in today, and they haven't already been
  nudged today (`users.lastNudgedDay` → idempotent, so pinger jitter can't double-send).
- Wording escalates: if they checked in **yesterday**, their streak is alive-but-at-risk tonight,
  so the copy is stronger ("Your streak needs you 🌱") vs. the gentle default.

### Why an external pinger (not Vercel Cron)
Vercel Cron on the Hobby plan runs **only once per day**, so it can't check multiple users'
different reminder times. Instead a free external scheduler pings the endpoint every 30 minutes;
the endpoint itself is a normal route with no frequency limit. `vercel.json` is intentionally
**not** used for this.

**Verified scheduler: [cron-job.org](https://cron-job.org)** (checked 2026-07) — free, unlimited
jobs, intervals down to every minute, supports custom `Authorization` headers. Note its request
**timeout is 30 s** (fine at this scale; keep in mind only if the user base grows large). Any
equivalent works (GitHub Actions cron, Upstash QStash, EasyCron).

---

## Go-live checklist

Everything below needs a real HTTPS deployment (push + service worker don't run over plain HTTP).

1. **Apply migrations** to the Neon DB (additive — two tables/columns, no data touched):
   ```
   npm run db:migrate
   ```
   Until this runs, `/api/cron/nudge` returns 500 ("relation does not exist").

2. **Generate VAPID keys** and paste all four into `.env.local` **and** Vercel → Settings →
   Environment Variables. Use a real address for the subject:
   ```
   npm run vapid
   # VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY
   # VAPID_SUBJECT="mailto:steven@agrader.sg"
   ```

3. **Set `CRON_SECRET`** (protects the endpoint) in `.env.local` + Vercel:
   ```
   openssl rand -base64 32
   ```

4. **Deploy** (`git push` if the repo is linked to Vercel).

5. **Create the pinger** on [cron-job.org](https://cron-job.org):
   - URL: `https://<your-app>/api/cron/nudge`
   - Schedule: **every 30 minutes**
   - Request header: `Authorization: Bearer <your CRON_SECRET>`
   - _(Optional)_ restrict the job's active hours (e.g. 6 AM – midnight SG) so it doesn't ping overnight.

6. **Install on the phone:** open the deployed URL in Android Chrome → menu → **Install app** →
   launch from the home-screen icon → tap **Enable** on the check-in card and pick a reminder time.

All env vars are documented in `.env.example`.

## Test it instantly (no waiting for your slot)

Once deployed and migrated, set your reminder time to the current half-hour in the app, then hit
the endpoint manually:

```
curl -H "Authorization: Bearer <CRON_SECRET>" https://<your-app>/api/cron/nudge
```

It returns `{ "ok": true, "candidates": <n>, "nudged": <n> }` and your phone should buzz. If
`nudged` is 0, check: reminder time matches the current 30-min slot, you haven't already checked
in today, and `lastNudgedDay` isn't already today (turning reminders off/on resets it).
