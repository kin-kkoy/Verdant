# Verdant — Status & Roadmap

_Shared tracker across all agents/sessions. Newest log entry on top. Keep this current._

## Current state (2026-06-17)
- **Phase:** Phase 0 + 1 + 2 **built & verified locally** (build clean — 9 routes, 17 tests pass,
  all routes 200). Live against the owner's Neon DB (account: Makkaon). Game layer (Phase 3+)
  remains deferred. Vercel deploy still deferred (running local).
- **Canonical prototype:** `prototypes/premium-mockup.html` — cozy cabin, light/dark,
  landing page + Garden & Stable pages (both top-down 2D) + Journal/Planner/Standings.
  Front-end only; nothing persists.
- **Decided:** stack, visual direction, information architecture, auth model, and the
  (deferred) economy + companion design. See `docs/NOTES.md` and `BUILD-PLAN.md`.
- **Built (Phase 0):** Next.js 15 (App Router, TS) scaffold; design tokens ported verbatim
  to `src/app/globals.css`; Drizzle schema (`users/checkins/weigh_ins/logs`) + generated
  migration; Neon serverless client (lazy); Auth.js v5 Credentials (name+password, bcrypt,
  75-day JWT) with `/login` + guarded `/hello` proof page; seed script with placeholder
  accounts; `todaySG()` (Asia/Singapore) + firewall stats helpers with 17 passing unit tests.
- **Locked decisions (kickoff Q&A):** local-only run for now (Vercel deploy later) · Drizzle ·
  group TZ `Asia/Singapore` · accounts seeded with placeholders, set real names before launch.

## Roadmap / phases
- [x] **Phase 0 — Scaffold:** Next.js + Neon + Auth.js; signed-in "hello" page proving the pipe.
      _(Vercel Blob deferred to Phase 2; Vercel deploy deferred — running local against Neon.)_
- [x] **Phase 1 — MVP tracker (SHIP THIS):** auth (2 accounts + visitor mode), check-in/streak,
      weigh-in, daily log, standings, cozy-cabin landing + Garden/Stable scenes (in-memory),
      Journal/Planner stubs. Built & verified locally. _(Vercel deploy still deferred.)_
- [x] **Phase 2 — Journal + Planner:** per-user journal (mood/title/note + photo, client-downscaled
      to a data URL in Postgres for now) with add modal + delete; per-user planner with interactive
      24h schedule (click-add, drag-move, rename, delete, auto-scroll to first block, expand toggle)
      + derived week-at-a-glance. _(Photos → Vercel Blob is a deferred swap; one util + one line.)_
- [ ] **Phase 3+ (later):** the game layer — garden growth, economy, companion + marathon. Art in cozy-cabin style.

- **2026-06-17** — **Efficiency pass** (cut backend cost before deploy). Removed the per-interaction
  `router.refresh()` cascade everywhere (kept `revalidatePath` so next-nav data is fresh). Planner
  now edits **locally** (buffered to a per-user/week localStorage draft for official users) and
  persists via an **explicit Save** → one `syncPlanWeek(weekStart, blocks)` call (replaces the 5
  per-block actions). Unsaved-changes pill + `beforeunload` guard + week-switch confirm. Journal
  add/delete optimistic (`addDiaryEntry` returns id → temp-id swap); check-in/weigh-in optimistic;
  requests approve/dismiss/delete update `RequestsBrowser` state locally. Net: planner edits = 0
  calls (1 on Save); other mutations = 1 call, no refetch cascade. tsc clean. _(build session)_
- **2026-06-17** — Paper modal v2 (`PaperModal.tsx`): outer shell + inner scroll, **drag either
  side edge to resize** (handles just outside the border; widening **adds image columns**, never
  scales), themed scrollbar, starts lower, thick outline. Fixed: drag ending on the backdrop no
  longer closes the modal (only closes if the press *started* on the backdrop). Added an **image
  lightbox** — clicking an image opens a focused full-screen view with prev/next.
- **2026-06-17** — Paper modal: floating delete/close tools lifted above images (z-index + solid
  chip bg) so images no longer block them. Planner: added a **Reset** button (below the schedule)
  that clears the viewed week to blank (`clearPlanWeek` server action, validated + per-user/week).
- **2026-06-17** — Journal refinements: entry cards show thumbnail/emoji + title + date only (no body
  preview, no author); check-in logs collapsed into ONE numbered "Check-in log" card pinned after
  Add-entry (→ Paper modal listing logs #N..#1 descending); modal delete moved left of close.
- **2026-06-17** — Requests: added **search** (name/code/message/status, `RequestsBrowser`) + a
  **permanent delete** (owner-only `deleteAccessRequest`) alongside dismiss. Journal **redesign**:
  diary entries are a **masonry** grid; clicking opens a **"Paper" modal** with **multiple images**
  laid out by count (1/2/3/4+ with +N) + serif title; entries hold up to 8 images
  (`diary_entries.photos text[]`, migration `0004`, legacy `photo` read-merged); activity **logs
  render row-by-row** (text only) below entries. See NOTES "Journal design". _(build session)_
- **2026-06-17** — UX pass: (1) **Smart refresh** — `RefreshButton` (router.refresh) + refetch on
  window focus/visibility, throttled to a real fetch at most once per ~75s (flashes spinner otherwise);
  on Standings/Journal/Requests. (2) **Activity logs folded into Journal** — daily check-in tags+notes
  show as read-only cards interleaved with diary entries (`getActivityLogs`). (3) **Planner add/rename**
  now use a styled modal instead of `window.prompt`. (4) **Weigh-in** centered + double-click the number
  to type an exact value. tsc clean; verified on running dev server. _(build session)_
- **2026-06-17** — Request-access reworked again → **claim-code flow** (zero email, self-hostable).
  Migration `0003` adds `code` + `approved_at` to `access_requests`. Visitor gets a `VRD-XXXX-XXXX`
  code; checks status via `/join` or the Request modal's "I have a code" tab. `/requests` is now
  **owner-only** (`src/lib/owner.ts`, `OWNER_NAME` env / first account). Approve starts a 14-day
  window; requester self-creates their account (own name/password/email + start weight). Codes
  single-use. tsc clean, routes verified on the running dev server. _(build session)_
- **2026-06-17** — Request-access reworked from mailto → in-app flow. New `access_requests` table
  (migration `0002`). _(superseded by the claim-code flow above)_
- **2026-06-17** — Planner week navigation added: `?week=` param, prev (unlimited) / next (capped
  +3 weeks via `PLANNER_WEEKS_AHEAD`) + "Today" jump; week scoped per `week_start`, range validated
  server-side in the page and `addPlanBlock`. Verified the +3 boundary disables Next and out-of-range
  falls back to the current week. _(build session)_
- **2026-06-17** — Phase 2 (Journal + Planner) built & verified locally. New tables
  `diary_entries` + `plan_items` (migration `0001`, applied to Neon). Journal: per-user entries
  with mood/title/note + optional photo (client downscale → data URL in Postgres), add modal,
  delete, visitor in-memory teaser. Planner: per-user timed schedule blocks rendered as both a
  24h day×time grid (click-add, pointer drag-move for mouse+touch, rename, ×-delete, auto-scroll
  to first block, expand/collapse) and a derived week-at-a-glance. Also fixed: removed nav
  backdrop blur (scroll jank), `suppressHydrationWarning` on <html> (theme-script hydration
  warning), journal add-card restyled (no footer). Build clean, tsc clean, 17 tests pass. _(build session)_
- **2026-06-17** — Phase 1 MVP tracker built & verified locally. Real routes (App Router) replace
  the SPA: `/` landing (4-stat row + check-in + weigh-in + chart/ring, wired to Neon per-user;
  visitors get an in-memory teaser), `/standings` (firewall-derived from real weigh-ins),
  `/garden` + `/stable` (ported top-down scenes, in-memory only), `/journal` + `/planner` stubs
  (Phase 2). Server actions: `checkInToday`, `saveWeighIn` (upsert by group-TZ day). Shared nav
  layout + theme toggle (localStorage) + falling leaves. `next build` clean (10 routes), tsc clean,
  17 tests pass, all routes 200 in visitor mode. Pending owner's Neon `DATABASE_URL` + seed. _(build session)_
- **2026-06-17** — Phase 0 scaffold built & verified locally. Next.js 15 + TS, Drizzle schema
  + migration, Neon client, Auth.js v5 Credentials (`/login` + guarded `/hello`), seed script,
  `todaySG`/stats helpers (17 tests pass). `next build` clean; dev server boots; `/hello`→`/login`
  guard confirmed (307). Pending owner's Neon `DATABASE_URL` to verify login→DB read.
  Decisions locked: local-only run, Drizzle, Asia/Singapore TZ, placeholder seed accounts. _(build session)_
- **2026-06-17** — Design phase complete. Prototype finalized: cozy-cabin theme, light/dark,
  top-down Garden + Stable, Journal add-card + add modal, interactive Planner schedule (click-add + drag),
  landing reordered to hero → 4-stat row → check-in → progress. Stable reverted from isometric to top-down.
  Docs (`START-HERE.md`, `docs/`) initialized. _(design session)_

<!-- Append new entries above this line: "- YYYY-MM-DD — what changed (who)" -->
