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
- [~] **Garden → real game layer (Phase 3, IN PROGRESS):** the in-memory `GardenScene` becomes
      a persistent, server-authoritative garden (two-layer: bet plants derived from real kg +
      tended pots from soft currencies). Building 3a (foundations) → 3b (decay) → 3c (skins).
      **Stable companion + marathon stay non-persistent placeholders — deferred to Phase 4**
      (with the automation tree). See NOTES "Game layer" + plan `dapper-sprouting-pixel.md`.
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
- [ ] **Verify login→DB read:** needs the owner's Neon `DATABASE_URL` (local-only build choice).
      Run `db:migrate` + `db:seed`, then sign in. Everything else in Phase 0 is verified.
- [ ] **Dev/build-tooling vulns:** `npm audit` shows advisories only in dev tooling (vitest/vite,
      drizzle-kit's bundled esbuild, postcss). Production libs (next 15.5.19, drizzle-orm 0.45.2,
      next-auth v5-beta) are at latest patched. `audit fix --force` would downgrade-break; skip.
- [ ] **Photo storage:** move off base64 → Vercel Blob; downscale client-side before upload.

## Safe to SKIP for v1 (ship faster; revisit later)
- **Anti-cheat hardening** — economy IS server-authoritative as of Phase 3 (idle/decay from
  stored `last_seen`, never the client clock), but deeper anti-cheat is unnecessary — 5 trusted
  users, and the firewall keeps kg/standings untouchable regardless.
- **Real-time / multiplayer sync** — intentionally NOT websockets (serverless can't hold sockets;
  would need a paid 3rd-party service, against self-host/$0). Instead: an in-app **Refresh button**
  (`router.refresh()`) + **refetch-on-focus**, throttled so a real fetch happens at most once per
  ~75s (inside the window the spinner flashes but no fetch). On Standings, Journal, Requests.
- **The whole game layer** (garden growth / economy / companion / marathon) — Phase 3+, NOT a launch blocker.
- **Polished scene art** — placeholder vector is fine for v1; swap in real assets later.
- **Drag-to-resize blocks** in the planner — defer. (Add/rename now use a styled modal, not
  `prompt()`; drag-to-MOVE is implemented.)
- **Users beyond 2** — only 2 official accounts needed at launch (+ visitor).

## Prototype-only quirks (not real bugs — won't carry over)
- `premium-mockup.html` block naming uses `prompt()`; the water-trough "water" uses the sky tint.
- Nothing persists across refresh (expected for a mockup).

## How to use this file
Add a new issue under **Open** with a one-line description. If you decide it can wait, move it
to **Safe to SKIP** with a one-line reason. Delete items only when truly resolved (note it in STATUS log).
