# Verdant — Status & Roadmap

_Shared tracker across all agents/sessions. Newest log entry on top. Keep this current._

## Log (2026-09-02) — T2: workout cards (the `workouts` scoring slot is now real)

- **`/workouts`** — a library of exercise cards you build, not a session logger. A card is a
  name, a figure, sets and an amount; tapping it logs a dated completion. Routines group cards
  and **Log all** logs the lot. Masonry grid + add-card, reusing the Journal's `.jmasonry` /
  `.jentry` / temp-id optimistic pattern and `PaperModal` for history.
- **The bundled pack:** 302 exercises × 3 frames from bryllim/workout-guide. `npm run exercises`
  (`scripts/build-exercise-assets.mjs`, uses the existing `sharp` dep) converts 512px → 256px
  16-colour palette PNGs, **32 MB → 5.0 MB**, and generates `src/lib/exercises/catalog.ts`.
  Licence is **CC BY-SA 4.0** → `CREDITS.md` added and must travel with the repo.
- ⚠️ **The art is WHITE line-work on transparent — invisible on the cream background as an
  `<img>`.** It's rendered as a **CSS mask** painted with `var(--ink)` (`ExerciseFigure`),
  which also makes the figures theme-aware for free. Verified by compositing the alpha against
  both palettes. If you ever swap in new art, keep the mask; don't reach for `<img>`.
- **`amount` + `unit`, not `reps`:** 49 catalogue entries are timed, so a Plank card reads
  "3 sets × 45 seconds". The unit is pre-filled from the catalogue when you pick an exercise.
- **Counters are derived** (`COUNT(exercise_logs)`), never stored — no second truth to drift.
  `exercise_logs` copies sets/amount/unit at log time so editing a card can't rewrite history.
- **Scoring:** `activity.ts` unchanged; `getActivityCalendar`/`getStandings` now feed `workouts`
  from `workoutsForDay(cardsLoggedThatDay, tags)` — the **max** of distinct cards and the old
  exercise tags, so pre-T2 days keep scoring with no cutover date.
- **Workouts are now opt-out** (`users.tracks_workouts`, new `TrackingPrefs` card on your own
  profile). Off drops the daily target by `MAX_WORKOUTS`, so a diet-only user fills their square
  on weight + check-in alone. Migration **`0011`**, additive, applied to Neon.
- Also fixed: `.modal` had no max-height/overflow, so a tall form ran off a phone screen
  (88vh + scroll now); modal inputs bumped 15px → 16px to stop mobile zoom-on-focus.
- Build clean (15 routes), tsc clean, **40 tests pass**. Verified against the live Neon DB:
  cards-without-logs score 0, the same card twice still counts once, two distinct cards fill the
  workout component, and turning workouts off lifts a weight+check-in day from level 2 to 4.
- **Next (T3):** nutrition — see the plan's locked decisions (Mifflin-St Jeor targets, the
  saved-foods → bundled-table → Open Food Facts cascade, Tesseract.js label OCR, sleep logged
  but not scored).

## Log (2026-09-01) — Invite-only profiles
- **`users.profile_visibility`** (`everyone` | `invited`, default `everyone`) + a **`profile_invites`**
  table (owner → viewer, one-way, no acceptance step). Migration **`0010`**, additive, applied to Neon.
- **Scope decision:** the lock covers the profile PAGE only. `/standings` stays fully public —
  it's the shared competition and everyone opted into that.
- Uninvited visitors get `LockedProfile`: the owner's name + avatar chip (they clicked through
  from Standings and already know whose it is), one of 15 lines from **`src/lib/teases.ts`**
  picked fresh per visit, and a plain "invite-only" note. No owner/admin bypass — a lock the
  host can peek through isn't one.
- **`ProfileAccess`** (own profile only): Everyone / Only-people-I-invite toggle plus per-person
  invite chips, optimistic with rollback, via `setProfileVisibility` / `setProfileInvite`.
- Access rules verified against the live DB across all four transitions (default → locked →
  invited → revoked → restored); DB left back on `everyone` with no invites. Build clean
  (14 routes), tsc clean, 32 tests pass.
- **Left alone:** the six activity tags. `Clean eating` / `Water` / `Sleep` are still stored in
  `logs.tags` and shown back on the check-in card + Journal, but feed NOTHING — only
  `EXERCISE_TAGS` (Workout/Walk/Yoga) score. Owner's call to keep them for now; phase 2's meal
  logging supersedes `Clean eating`.

## Log (2026-09-01) — Phase 1 of the tracker overhaul: game stripped, contribution graph shipped
- **The app is now an activity tracker, not a weight bet.** The cozy-cabin hero scene is replaced
  by a **GitHub-style contribution graph** — a year of day-squares that brighten with how much of
  your day you logged. New **`/profile/[id]`** routes (any signed-in user can read any profile;
  visitors are redirected to `/login`). `/standings` now ranks by **consistency** (active days in
  the trailing 30, then points, then streak) with **kilograms** kept as a second view (`?view=kg`).
- **Scoring — `src/lib/activity.ts`** (pure, 14 tests). Two rules: points (0–7) and shades (0 plus
  4 fills) are separate; and **level is points against the user's OWN target**, so a dieter and a
  lifter can both reach the brightest square by completing their own card. Phase-1 sources are
  weigh-ins, check-ins and the day's exercise tags — `meals` stays 0 and `users.meals_per_day`
  stays null until Phase 2, which keeps meals out of the target so the top shade is reachable now.
  `workouts` is a COUNT, not a flag: a tag only exists on a day you also checked in, so a boolean
  would skip level 3 entirely.
- **Signed goals.** `goal_kg` may now be negative ("gain 3 kg"); `progressPct` scores `lost/goal`
  with matching signs and the goal modal has a lose/gain toggle. Bulking counts as progress.
- **Stripped:** `/garden`, `/stable`, `GardenScene`, `StableScene`, `CabinScene`, `lib/garden/*`,
  `economy.ts` (+ its 16 tests), the scene CSS and tokens. Migration **`0009`** drops the `gardens`
  table (applied to Neon) and adds `users.meals_per_day`. `FallingLeaves` and the warm palette stay.
- **`getStandings` no longer does N+1** — four grouped queries instead of two per user.
- Build clean (14 routes), tsc clean, **32 tests pass**, all routes 200 (`/garden` + `/stable` 404).
- **Next (Phase 2):** meal logging (protein/calories) and workout cards (exercise → sets → reps),
  wired into the `meals` / `workouts` slots that already exist in the scorer.

## Log (2026-07-15) — PWA + push notifications built (not yet activated)
- **PWA (Chunk A):** installable, offline-capable app shell — manifest, maskable icons,
  auth-safe service worker, offline page. Reuses the whole Next.js stack; Android install ready.
- **Reminders (Chunk B):** Web Push with a **per-user reminder time** (30-min slots, per-timezone).
  Triggered by a free external 30-min pinger ([cron-job.org](https://cron-job.org)), NOT Vercel Cron
  (Hobby caps that at 1/day). Migrations `0007` + `0008` (additive). Build + 33 tests green.
- **Not live yet** — needs: `npm run db:migrate`, VAPID keys, `CRON_SECRET`, deploy, and the pinger.
  **Full setup + test steps: see `docs/NOTIFICATIONS.md`.**

## Current state (2026-06-18)
- **Phase:** Phase 0 + 1 + 2 **built & verified locally** (build clean — 9 routes, 17 tests pass,
  all routes 200). Live against the owner's Neon DB (account: Makkaon). Vercel deploy still
  deferred (running local). **Phase 3 (game layer) is now IN PROGRESS** — design approved,
  building sub-phase 3a (see roadmap + log below).
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
- [x] **Phase 3 — Game layer (garden-first). REMOVED 2026-09-01** — the app pivoted to workout
      tracking; the garden/stable/economy were stripped in the Phase-1 overhaul above. Kept here
      for history only. _Original plan:_
      Sub-phases: **3a** foundations (gardens table, `economy.ts` earn + derived blooms,
      asset seam, bet plants from real kg, currency HUD) → **3b** idle + meaningful decay →
      **3c** customization/skins + automation tree + Bloom spend sinks. Companion + marathon
      pushed to **Phase 4**. Art is **not locked** → built behind an asset-agnostic seam
      (parametric SVG generator default; bundled CC0/own assets override by manifest).
- [x] **Phase 4 (companion + marathon):** dropped along with the game layer.

### Tracker overhaul (current track)
- [x] **T1 — Strip the game + contribution graph + profiles + consistency standings.** Done 2026-09-01.
- [ ] **T2 — Meal logging** (per-meal protein/calorie entries) → fills the `meals` slot in
      `activity.ts` and turns on `users.meals_per_day` per user.
- [ ] **T3 — Workout cards** (exercise → sets → reps) → replaces exercise tags as the `workouts`
      source; tags stay as the fallback for days logged before it shipped.

- **2026-06-18** — **Phase 3a built & verified locally (game-layer foundations).** New
  `gardens` table (migration `0006`, applied to Neon — additive, no firewall table touched).
  New **`src/lib/economy.ts`** (pure, the game's home; one-way imports from stats/date) +
  **`economy.test.ts`** (16 tests). Asset seam: **`src/lib/garden/plants.tsx`** (parametric
  `genPlant` + 6 `SPECIES` + `PlantArt` resolver, CSS-var fills → light/dark free) and
  **`assets.ts`** (file-override manifest, empty = generator default). `data.ts` `getGarden`
  (lazy-creates row; bet beds + Blooms DERIVED from weigh-ins; currencies/tended from storage)
  + `getVisitorGarden`. Earning folded into `checkInToday` (Sun + tag→Water/Compost, awarded
  once on the day's first check-in). New `plantSeed`/`tendPlant` spend actions (optimistic,
  `revalidatePath` only). `GardenScene` now props-driven: currency HUD, kg-derived bet beds
  (read-only), tended pots (tap to grow). Build clean (13 routes), tsc clean, **33 tests pass**,
  all routes 200 incl. visitor `/garden` ("guest — not saved", in-memory). _NO idle/decay yet
  (3b)._ _(build session)_
- **2026-06-18** — **Phase 3 designed & approved (game layer, garden-first).** Locked via
  owner Q&A: garden-first light economy; meaningful-but-fair decay (§4.4); companion
  deferred to Phase 4; **art style NOT locked** (owner leans CC0 flat-vector > generator >
  pixel, may bring own assets) → build an **asset-agnostic rendering seam** (generator
  default, files override). Core design: **two-layer garden** — a *bet garden* whose
  growth is DERIVED from real kg (firewall-safe, never dies, droops cosmetically) + a
  *tended garden* grown from soft currencies that carries the full §4.4 decay. Bet garden:
  **5 beds, one blooms per kg, scaled to each user's `goal_kg`** (open-ended for no-goal
  accounts). Bloom/Pure Bloom **derived** from weigh-in truth (store only `bloom_spent`).
  Plan: `~/.claude/plans/dapper-sprouting-pixel.md`. _(design session)_

- **2026-06-17** — **Editable + optional goals.** `users.goal_kg` made nullable (migration `0005`);
  `updateGoal(number|null)` self-service action + `GoalEditor` modal in the progress goal card
  ("Set/Edit goal" or "No goal — just track"). `pct`/`goalKg` are nullable through `data.ts`; the
  goal stat, progress ring, "to go", and standings %/track degrade to a "just tracking" state when
  no goal is set. Build clean. _(build session)_
- **2026-06-17** — Added **skeleton loading screens** (`loading.tsx` per route: landing, standings,
  journal, planner, garden, stable, requests) so navigation shows an instant placeholder while the
  page's server data loads (covers the Neon cold-wake delay). Shared `components/skeletons.tsx`
  (flat opacity-pulse, no gradient; respects reduced-motion). Login button shows a pending
  "Signing in…" state via `useFormStatus` (`components/SubmitButton.tsx`). Also added the tab
  **favicon** (`app/icon.svg`). Build clean (13 routes). _(build session)_
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
