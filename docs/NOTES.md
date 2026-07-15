# Verdant — Durable Notes (must-know for all agents)

_The things that aren't obvious from the code. Keep it tight. Deep detail lives in
`BUILD-PLAN.md` (architecture) and `prototypes/SPECS.md` (full feature design)._

## The product
- Private bet tracker for 2 friends (Test & Mei), expandable to ~5. First to lose **5 kg** wins.
- Cozy autumn **cabin homestead** theme. Not monetized. Free tiers only. No hard deadline
  (September/autumn is a soft, motivational target — never hardcode it).

## ⚠️ THE FIREWALL (non-negotiable)
- **Real kilograms decide the bet.** Standings = actual logged weight, full stop.
- The garden, companion, economy, and races are flavor/motivation — they must **never**
  buy, fake, or decide the bet. This keeps it honest (trust-based, no money).

## Visual direction (locked)
- **Cozy cabin / autumn**, premium & flat: warm palette, hairline borders, one accent
  (burnt orange), Hanken Grotesk + Instrument Serif (italic accents).
- **Light + dark mode** — the cabin scene shifts day↔night (moon, stars, glowing windows).
- Rules: **NO decorative gradients** (flat fills only), no over-rounded/cluttered cards,
  clean buttons (not glossy pills), and it **must not be laggy** (no heavy blur/animated gradients).
- Canonical reference: `prototypes/premium-mockup.html`. The pixel and botanical-serif looks are dead ends.

## Information architecture
- **Landing (one scroll):** navbar → hero = cabin scene → 4-stat row (Lost / Goal / Streak /
  Days in) → **check-in input** → progress ("season so far") → footer.
- **Navbar:** Journal · Planner · Standings (+ light/dark toggle + Check in).
- **Scene-only pages (NOT in navbar):** click the garden's sign → Garden page; click the
  stable's sign → Stable page. **Both are top-down 2D** (isometric was tried and dropped).
  Each has a back button. The cabin itself is decorative for now.
- Journal: first card is an **"Add entry"** card (same shape as the rest) → opens an add modal.
- Planner: a week-at-a-glance row **+** an interactive day×time **schedule** (tap empty slot to
  add a block, drag blocks to rearrange — must stay touch-friendly for iPad).
- Must look good on **laptop AND iPad** (verified responsive at 768px).

## Stack & infra
- **Next.js** (App Router) on **Vercel** (Hobby, free) · **Neon** Postgres (free) · **Auth.js** ·
  **Vercel Blob** (photos) · **PWA**. Cost target: **$0**. (Render was rejected — cold starts.)
- Economy (when built) must be **server-authoritative** (compute idle/decay from `last_seen`;
  never trust the client clock). Pick **one group timezone** for streak rollover — decide early.

## Auth model
- **2 official accounts** at launch: chosen **name + password** (+ optional Google for quick
  login / recovery).
- **Visitor mode:** no login, fully interactive teaser. **Nothing persists at all — in-memory
  state only, wiped on refresh / navigation / unmount. Do NOT use localStorage or any storage
  for visitors.** (The canonical mockup already behaves this way.) A nav **"Request access"**
  button lets a visitor ask to become official.
- **Persistent stay-logged-in** (long session), like YouTube/Claude. No open public signup.

## Game layer (Phase 3 — IN PROGRESS, garden-first; companion → Phase 4)
- Garden = weight progress (plants grow as you lose). Stable companion + end-of-season
  **marathon** are **deferred to Phase 4**. Full design ref: `SPECS.md §4`.
- **Two-layer garden** (the key design — honors meaningful decay AND the firewall):
  - **Bet garden** — core beds; growth **DERIVED from real kg** (read of the truth),
    **never dies**, only droops cosmetically when neglected → revives on check-in.
    Layout: **5 beds, one blooms per kg, scaled to the user's `goal_kg`** (no-goal accounts
    get an open-ended garden, no bloom cap). No storage — computed from `weigh_ins`.
  - **Tended garden** — extra pots grown from soft currencies + idle; carries the **full
    §4.4 decay incl. death/regrow**. Decay only ever touches THESE + soft currencies.
- **Economy lives in `src/lib/economy.ts`** (pure, unit-tested — the game's home, mirroring
  how `stats.ts` is the firewall's home). One-way imports: economy → stats/date, never back.
  - Soft currencies (Sun/Water/Compost) earned by logging (logging *is* earning; folded into
    `checkInToday`/log actions). Tag→currency map: **Water currency** ← Workout/Walk/Yoga;
    **Compost currency** ← Clean eating / Water(=hydration) / Sleep. *(Name collision: the
    "Water" activity tag = hydration → Compost; the Water currency is exercise.)*
  - **Bloom & Pure Bloom are DERIVED from kg truth, not stored.** Pure Blooms = monotonic
    `floor(max_kg_lost_ever / 0.5)`; spendable balance = `earned − bloom_spent` (store only
    `bloom_spent`). Spending never moves kg/standings/Pure Blooms.
- **`gardens` table** (migration `0006`, additive — touches no firewall table):
  `sun, water, compost, bloom_spent, skin jsonb, plant_state jsonb (tended pots only),
  automation jsonb, last_seen`. `companions/gifts/races` NOT created yet (Phase 4).
- **Server-authoritative** idle/decay computed from stored `last_seen` vs server `now`
  (never the client clock). Visitor garden = in-memory demo only (no DB/localStorage).
- Sub-phases: **3a** foundations (no decay) → **3b** idle + decay → **3c** skins + automation
  + Bloom sinks. Check in at each boundary before building the next.

## Assets — strategy (decided 2026-06-18: asset-agnostic seam)
- Art style is **NOT locked** (owner leans CC0 flat-vector > parametric generator > pixel,
  and may supply **own assets**) → don't marry the economy to any art source.
- **Asset-agnostic rendering seam:** game logic renders by **logical key** (`{species,stage}`,
  decor, vessel); a **registry** resolves a key to a renderer. Default = **parametric SVG
  generator** (`genPlant`+`SPECIES` in `src/lib/garden/plants.tsx`, fills with CSS palette
  vars so light/dark is free, zero binary assets → self-host clean). **File override** =
  manifest mapping a key to bundled assets under `public/garden/…` (`<species>/<stage>.svg|png`
  + optional `-dark`). Resolution: file renderer → generator fallback. Swapping art edits a
  manifest, never the game code. `CREDITS.md` added only if a CC-BY pack is bundled.
- Still: **never ripped game art** (no real Stardew/Pokémon sprites). Prefer CC0; AI art only
  as one-off decor accents (gnome/cat), never the core plants.

## Planner schedule — build notes
- 12-hour labels (`7 AM`), show **all 24 hours** (Google-Calendar style), **auto-scroll to the
  first hour that has a block** on open, scrollable with an **expand-to-full-day** toggle.

## Assets (scene / game art)
- Use **licensed** assets, never ripped game art (no actual Stardew/Pokémon sprites).
- Prefer **CC0** (e.g. Kenney.nl) or **CC-BY** (credit in a `CREDITS.md`). AI-made art is OK
  as a supplement (watch style consistency).
- Premium **flat-vector** is preferred to match the look; free *pixel* packs are an option
  only if the owner accepts pixel for the game scenes. Specific pack candidates: see chat history.

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
- **The firewall lives in `src/lib/stats.ts`** (`lostKg`/`streakDays`/`progressPct`) + `data.ts`
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
