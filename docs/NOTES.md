# Verdant — Durable Notes (must-know for all agents)

_The things that aren't obvious from the code. Keep it tight. `BUILD-PLAN.md` and
`prototypes/SPECS.md` describe the app's earlier life as a cabin/garden game — history, not
instructions (see "What changed" below)._

## The product
- Private body & workout tracker for ~2–5 friends. Centrepiece: a **GitHub-style contribution
  graph** — a year of day-squares that brighten with how much of your day you logged.
- A friendly competition runs alongside it, ranked on **consistency**; kilograms are a second,
  informational board. Not monetized. Free tiers only. No hard deadline.
- Warm autumn palette (inherited), but the cabin/garden/stable framing is gone.

## What changed (2026-09-01)
The app pivoted from a cozy-cabin **5 kg weight-loss bet with a garden game** to an activity
tracker. Deleted: `/garden`, `/stable`, the three scene components, `lib/garden/*`, `economy.ts`,
and the `gardens` table (migration `0009`). Kept: the palette, typography, falling leaves, daily
quote, Journal, Planner, the claim-code auth flow.

## ⚠️ NOTHING COSMETIC DECIDES A RANK (non-negotiable)
- Boards derive **only** from real logged data — weigh-ins, check-ins, and (from T2/T3) meals
  and workouts. Nothing decorative or gamified may buy, fake, or alter a rank.
- This is the same rule the old "firewall" enforced; only the inputs widened. It keeps the
  competition honest (trust-based, no money).

## ⚠️ A COMPLETE DAY IS RELATIVE TO THE USER (non-negotiable)
- Level 4 means "you did **your** card", never "you did the most possible". Scoring is
  `points / targetPoints`, where the target is derived from the trackers that user actually
  uses — so a dieter and someone bulking can both reach the brightest square.
- All of it lives in **`src/lib/activity.ts`** (pure, unit-tested). Never inline scoring
  elsewhere; add a component there and everything downstream follows.
- Points run 0–7 internally; the graph draws **4 filled shades plus empty**. Don't add shades —
  the eye can't separate more than that.
- `workouts` is a **count, not a flag**. In T1 the source is the day's exercise tags, and a tag
  can only exist on a day you also checked in — a boolean would make points jump 2 → 4 and leave
  the second-brightest shade unreachable. This was caught by rendering it, not by reading it.
- `users.meals_per_day` is **null** for everyone until T2 ships. Null deliberately excludes
  meals from the target; setting it before meal logging exists would make the top shade
  unreachable overnight.

## Visual direction (locked)
- **Warm autumn**, premium & flat: warm palette, hairline borders, one accent (burnt orange),
  Hanken Grotesk + Instrument Serif (italic accents).
- **Light + dark mode** — every colour is a CSS custom property on `:root` with a
  `[data-theme="dark"]` override. Graph shades are `--sq-0 … --sq-4`.
- Rules: **NO decorative gradients** (flat fills only), no over-rounded/cluttered cards,
  clean buttons (not glossy pills), and it **must not be laggy** (no heavy blur/animated gradients).
- **Charts are hand-written inline SVG** — the contribution graph and the weight chart both.
  No chart library; don't add one.
- `prototypes/premium-mockup.html` is where the CSS was ported from. Its palette and component
  shapes still apply; its cabin/garden/stable scenes do not.

## Information architecture
- **Landing (one scroll):** navbar → hero (daily quote + falling leaves) → **contribution
  graph** → 4-stat row (Active days / Streak / kg / Days in) → **check-in input** →
  progress ("season so far") → footer.
- **Navbar:** Profile · Journal · Planner · Standings (+ light/dark toggle + Check in).
- **`/profile/[id]`** — name, avatar chip, the graph, four totals, and links to everyone else.
  `/profile` redirects to your own. Signed-in only.
- **`/standings`** — consistency board by default, `?view=kg` for kilograms.
- Journal: first card is an **"Add entry"** card (same shape as the rest) → opens an add modal.
- Planner: a week-at-a-glance row **+** an interactive day×time **schedule** (tap empty slot to
  add a block, drag blocks to rearrange — must stay touch-friendly for iPad).
- Must look good on **laptop AND iPad** (verified responsive at 768px).

## Stack & infra
- **Next.js** (App Router) on **Vercel** (Hobby, free) · **Neon** Postgres (free) · **Auth.js** ·
  **Vercel Blob** (photos) · **PWA**. Cost target: **$0**. (Render was rejected — cold starts.)
- Group timezone for streak rollover is **Asia/Singapore**, fixed in `src/lib/date.ts`.

## Auth model
- **2 official accounts** at launch: chosen **name + password** (+ optional Google for quick
  login / recovery).
- **Visitor mode:** no login, fully interactive teaser. **Nothing persists at all — in-memory
  state only, wiped on refresh / navigation / unmount. Do NOT use localStorage or any storage
  for visitors.** (The canonical mockup already behaves this way.) A nav **"Request access"**
  button lets a visitor ask to become official.
- **Persistent stay-logged-in** (long session), like YouTube/Claude. No open public signup.

## Profile visibility (decided 2026-09-01)
- `users.profile_visibility` is `everyone` (default) or `invited`; `profile_invites` rows
  (owner → viewer) are the allowlist. Invites are **one-way** — no acceptance step, no
  notification; they only control what the viewer can open.
- **The lock covers the profile PAGE only.** `/standings` stays fully public — it's the shared
  competition and everyone opted into that. A locked person's active days and points are still
  visible there, by design.
- **No owner/admin bypass.** `OWNER_NAME` doesn't get to peek; a lock the host can see through
  isn't a lock.
- Uninvited visitors get the owner's name + avatar (they arrived from a named link) plus a random
  line from `src/lib/teases.ts`, fresh per visit. The route is dynamic, so `Math.random()` at
  render is fine — don't add seeding or storage.

## Check-in tags (state as of 2026-09-01)
- Six tags: Workout, Walk, Yoga, Clean eating, Water, Sleep. Only the first three
  (`EXERCISE_TAGS`) score; the other three are stored in `logs.tags` and shown back on the
  check-in card and in the Journal, but **feed nothing**. Owner's explicit call to keep them.
- T2's meal logging supersedes `Clean eating`. Revisit the set then rather than piecemeal.

## Planner schedule — build notes
- 12-hour labels (`7 AM`), show **all 24 hours** (Google-Calendar style), **auto-scroll to the
  first hour that has a block** on open, scrollable with an **expand-to-full-day** toggle.

## Assets
- There is no bundled art. Every visual is inline SVG or CSS, filled from palette variables, so
  light/dark is free and self-hosting stays clean. Keep it that way unless there's a real reason.
- If art is ever added: **licensed only**, never ripped game art. Prefer CC0 (e.g. Kenney.nl) or
  CC-BY with credit in a `CREDITS.md`.

## Journal design (decided 2026-06-17)
- Purpose: **reflection + accountability + thoughts.** Per-user (private).
- **Diary entries** render as a **masonry/mosaic** grid of cards. A card shows ONLY thumbnail/
  emoji + title + date (NO body preview, NO author — author is always the user). Clicking opens a
  **"Paper" modal** (warm flat surface + notebook margin line, serif italic title — NO gradients)
  with the full entry: **multiple images** by count (1 = big, 2 = pair, 3 = wide + two, 4+ = 2×2
  with "+N") then the writing. Up to 8 images, client-downscaled to data URLs
  (`diary_entries.photos text[]`, legacy `photo` read-merged). No-image entries are just text.
- **Check-in logs** = ONE **"Check-in log" card** pinned right after Add-entry (only if ≥1 log).
  It shows a **number** (total check-ins) instead of an emoji. Click → a Paper modal listing all
  logs **numbered descending** (#N … #1, so you see how long you've been logging), text only.
- **Modals:** delete sits to the **left of the close (×)** in the top-right tools; log modal has
  no delete (logs are records). The Paper modal (`PaperModal.tsx`) is an outer **shell** (fixed
  box, thick outline, themed scrollbar) + inner scroll area, **resized by dragging either side
  edge** (`.redge`, just outside the border; centered box → width = 2× distance from viewport
  centre to pointer; clamped 340…min(960,94vw)). Widening **adds image columns** (fixed cell size)
  rather than scaling content — single image shown large, 2+ in a column-adding grid showing all.

## Goals are editable & optional (decided 2026-06-17)
- The bet (lose 5 kg) is the **main** use case, but each user can **edit their own goal** (any kg)
  or **clear it entirely** to just track with no goal. `users.goal_kg` is now **nullable** (null =
  no goal); new accounts still default to 5. Self-service via `GoalEditor` (in the progress goal
  card) → `updateGoal(number | null)`. `Dashboard.pct`/`Standing.pct` are `null` when no goal;
  the ring, "to go", goal stat, and standings %/track all degrade gracefully to a "tracking" state.

## Cost/efficiency conventions (durable — keep Vercel/Neon usage low)
- **Never call `router.refresh()` after a mutation.** Update local React state optimistically; keep
  `revalidatePath(...)` in the action (cache-bust only, no query) so the next *navigation* is fresh.
  `router.refresh()` re-runs layout + page server components = several Neon queries per call.
- **Batch high-frequency edits.** The Planner edits in-memory and persists on an **explicit Save**
  via `syncPlanWeek(weekStart, blocks)` (one call replaces the week). Official users' unsaved edits
  are buffered to a localStorage draft (`verdant.plan.<userId>.<weekStart>`), cleared on Save; an
  "unsaved changes" pill + `beforeunload` + week-switch confirm prevent silent loss. (Visitors keep
  edits in-memory only — no storage.)
- **Optimistic mutations return what the client needs** (e.g. `addDiaryEntry` returns the new id so
  the temp id can be swapped without a refetch).
- Keep `OWNER_NAME` set so `isOwner()` is a string compare (no per-nav DB query).
- The Refresh button + throttled (~75s) focus-refetch are the only deliberate "live" refreshes.

## Real-app build conventions (Phase 0/1 — durable)
- **"Today" is `todaySG()`** in `src/lib/date.ts` (fixed `Asia/Singapore`). NEVER use a bare
  `new Date()` for day/streak decisions. All `day` DB columns store this group-TZ calendar day.
- **Derivations live in `src/lib/stats.ts`** (`lostKg`/`streakDays`/`progressPct`) and
  **`src/lib/activity.ts`** (the graph's scoring) + `data.ts`
  (`getStandings`). Standings derive ONLY from real weigh-ins. Keep game state out of these.
- **Visitor mode** = not logged in → server passes `mode:'visitor'` + demo data; client cards
  keep state in React only and skip server actions. No `localStorage`/DB for visitor tracker
  state. (Theme toggle in `localStorage` is the one allowed exception — it's app chrome.)
- **Daily writes upsert by `(user_id, day)`** (unique constraints): `checkInToday` writes a `logs`
  row + a `checkins` row; `saveWeighIn` writes a `weigh_ins` row. Re-running same-day overwrites.
- **Routing:** real App Router pages under `src/app/(site)/` share a nav layout; `/login` is
  outside the group (no nav). The mockup's SPA router is replaced by real routes.
- **Accounts are seeded** (`scripts/seed.ts`, edit `OFFICIAL_ACCOUNTS`); no open signup.
- **Versions pinned for CVEs:** Next 15.5.x, drizzle-orm 0.45.x. Remaining `npm audit` items are
  dev-tooling only (vitest/esbuild/postcss) — don't `audit fix --force` (it downgrade-breaks).

<!-- Add new durable decisions here. If it only matters to one session, it doesn't belong. -->

## Goals are signed (decided 2026-09-01)
- `users.goal_kg` may be **negative**, meaning "gain that many kg". `lostKg` is `start − latest`,
  so it carries the same sign, and `progressPct` scores `lost / goal` with matching signs —
  someone bulking toward −3 kg who is 1.5 kg heavier reads 50%, not 0.
- The goal modal splits this into a lose/gain toggle plus a magnitude; only the signed value is
  stored. `goal === 0` is rejected.

## Standings ranking (decided 2026-09-01)
- Default board sorts by `activeDays30`, then `points30`, then `streak`. Kilograms is a second
  view (`?view=kg`), never the default.
- Rationale: a scale can't tell muscle from anything else, so someone training hard can gain
  weight while getting leaner. Consistency is the one measure that's fair whichever way a
  person's weight is headed. Don't blend the two into one score — the weighting would be
  arbitrary and arguable.
- `getStandings` uses **four grouped queries**, not one per user. It used to be N+1; don't
  reintroduce that.
