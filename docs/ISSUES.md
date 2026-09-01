# Verdant — Issues & Deferrals

_Bugs/risks + what we INTENTIONALLY skip to ship faster. Triage lives here._

## Open — address during the relevant phase
- [x] **Persistence:** DONE for the tracker — `getDashboard`/`getStandings` read Neon; server
      actions `checkInToday`/`saveWeighIn` upsert by group-TZ day. (Journal/Planner persistence Phase 2.)
- [~] **Photo storage:** Phase 2 stores client-downscaled photos as data URLs in Postgres
      (`diary_entries.photo`). DECISION (owner): fine for local-only / few users. Swap to Vercel
      Blob at deploy time — only `src/lib/photo.ts` + the storage line in `addDiaryEntry` change.
- [x] **Interactive Planner schedule:** DONE — 24h grid, click-add, pointer drag-move (mouse+touch),
      rename, delete, auto-scroll to first block, expand/collapse. Per-user, persists to `plan_items`.
- [x] **Planner week navigation:** DONE — prev/next via `?week=YYYY-MM-DD`, previous weeks
      unlimited, capped at **3 weeks ahead** (`PLANNER_WEEKS_AHEAD` in `date.ts`), with a "Today"
      jump. Range validated server-side in both the page and `addPlanBlock` (no trust in input).
- [x] **Garden / game layer:** REMOVED 2026-09-01. The app pivoted to activity tracking; the
      garden, stable, economy and `gardens` table are gone (migration `0009`). Not coming back.
- [ ] **Service worker cache is still `verdant-v1`** (`public/sw.js`). Anyone who installed the
      PWA has the OLD cabin app shell cached under that key. **Bump to `verdant-v2` before the
      next deploy** or they'll be served the stale shell. Deliberately deferred until after T2/T3
      so it's bumped once.
- [ ] **`users.meals_per_day` is null for everyone.** Correct for now — null keeps meals out of
      the scoring target. T2 must set it per user when meal logging ships, or the brightest
      square silently gets harder to reach.
- [x] **Exercise tags as the workout source:** RESOLVED in T2 — `workoutsForDay` takes the MAX of
      distinct exercise cards logged that day and `countExerciseTags(logs.tags)`, so the tag path
      still scores pre-T2 days. Don't remove it.
- [x] **Workout points exceeding a target that excludes them:** FIXED 2026-09-02 —
      `effectiveTrackers` in `activity.ts` widens a single day's target to cover any component the
      user actually logged. Logging work you've switched off earns the points but also raises that
      day's bar, so it can't hand out a free full square.
- [ ] **`public/exercises/` is ~5 MB of committed PNGs.** Fine for git and for Vercel, and they're
      fetched per-exercise on demand so a phone never downloads all of it. Regenerate with
      `npm run exercises <source-dir>` if the art is ever replaced.
- [ ] **`canViewProfile` has no unit test** — it's DB-backed, so it was verified by a live probe
      against Neon (all four transitions) rather than in vitest. Worth a test if it grows.
- [x] **Timezone for "today"/streak rollover:** RESOLVED — fixed group TZ `Asia/Singapore`,
      centralized in `src/lib/date.ts` (`todaySG`). All day logic must go through it.
- [x] **Neon connection limits:** RESOLVED — using `@neondatabase/serverless` HTTP driver;
      `.env.example` documents using the POOLED connection string.
- [x] **Auth — visitor mode + Request access (claim-code flow):** DONE, and deliberately
      **zero-infra / no email** so the app stays self-hostable (see memory: self-hostable-intent).
      Visitor submits name+message → gets a **claim code** (`VRD-XXXX-XXXX`). They return via
      "Have a code?" (nav link → `/join`, or the Request modal's "I have a code" tab) and enter it
      to see status. **Owner-only** `/requests` (gated by `isOwner()` in `src/lib/owner.ts`:
      `OWNER_NAME` env var, else first-created account) → Approve / Dismiss. Approve starts a
      **14-day window**; the requester then self-creates the account (their own login name/password/
      email + start weight) at `/join`. Codes are single-use (status → completed). Google provider
      still optional/stubbed in `src/lib/auth.ts`.
- [ ] **OWNER_NAME env var:** set it (to the owner's login name) in `.env.local` and on the deploy
      host for robust owner-gating; without it, the first-created account is treated as owner.
- [x] **Verify login→DB read:** RESOLVED — live against the owner's Neon DB (accounts Makkaon, Tsi).
- [ ] **Dev/build-tooling vulns:** `npm audit` shows advisories only in dev tooling (vitest/vite,
      drizzle-kit's bundled esbuild, postcss). Production libs (next 15.5.19, drizzle-orm 0.45.2,
      next-auth v5-beta) are at latest patched. `audit fix --force` would downgrade-break; skip.
- [ ] **Photo storage:** move off base64 → Vercel Blob; downscale client-side before upload.

## Safe to SKIP for v1 (ship faster; revisit later)
- **Anti-cheat hardening** — unnecessary with ~5 trusted users, and boards derive only from real
  logged data regardless. Someone could pad their own squares by checking in dishonestly; that's
  a social problem, not a technical one.
- **Real-time / multiplayer sync** — intentionally NOT websockets (serverless can't hold sockets;
  would need a paid 3rd-party service, against self-host/$0). Instead: an in-app **Refresh button**
  (`router.refresh()`) + **refetch-on-focus**, throttled so a real fetch happens at most once per
  ~75s (inside the window the spinner flashes but no fetch). On Standings, Journal, Requests.
- **Signed-out lockdown** — `/` and `/standings` are publicly reachable but render generated demo
  data ("Guest view"), never real names or numbers. `/profile/*` IS gated. Owner reviewed this
  2026-09-01 and chose to keep the visitor teaser.
- **Drag-to-resize blocks** in the planner — defer. (Add/rename now use a styled modal, not
  `prompt()`; drag-to-MOVE is implemented.)
- **Users beyond 2** — only 2 official accounts needed at launch (+ visitor).

## Prototype-only quirks (not real bugs — won't carry over)
- `premium-mockup.html` block naming uses `prompt()`; nothing persists across refresh.
- The mockup's cabin/garden/stable scenes are no longer part of the app at all.

## How to use this file
Add a new issue under **Open** with a one-line description. If you decide it can wait, move it
to **Safe to SKIP** with a one-line reason. Delete items only when truly resolved (note it in STATUS log).
