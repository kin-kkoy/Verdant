# Verdant

A private body & workout tracker for a small group (~2–5 friends). The centrepiece is a
**GitHub-style contribution graph** — a year of day-squares that brighten with how much of
your day you logged. A friendly competition runs alongside it, ranked on **consistency**
rather than kilograms alone. Built with Next.js (App Router) + Neon Postgres + Drizzle + Auth.js.

> Decisions and roadmap live in `docs/` (`NOTES.md`, `STATUS.md`, `ISSUES.md`). `BUILD-PLAN.md`
> and `prototypes/` describe the app's earlier life as a cozy-cabin weight-loss bet with a
> garden game — read them as history. See `START-HERE.md` first.

## Local development

1. **Install deps**
   ```bash
   npm install
   ```

2. **Configure env** — copy the example and fill in your secrets:
   ```bash
   cp .env.example .env.local
   ```
   - `DATABASE_URL` — your Neon **pooled** connection string (`…-pooler.…`, with `?sslmode=require`).
   - `AUTH_SECRET` — generate one: `npx auth secret` (or `openssl rand -base64 32`).

3. **Create the tables** (runs the generated SQL migration against your Neon DB):
   ```bash
   npm run db:migrate
   ```

4. **Seed the official accounts** — first edit the `OFFICIAL_ACCOUNTS` array at the top of
   `scripts/seed.ts` (names, start weights, passwords are placeholders), then:
   ```bash
   npm run db:seed
   ```
   To change one account's password later without touching anything else:
   ```bash
   npx tsx scripts/reset-password.ts "<login name>" "<new password>"
   ```

5. **Run it**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000. Signed out you get a working demo (generated graph, sample
   standings) — sign in with a seeded account to see real data.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Run unit tests (Vitest) |
| `npm run db:generate` | Generate a new SQL migration from `src/lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to the DB in `DATABASE_URL` |
| `npm run db:push` | Push schema directly (dev convenience; prefer migrate) |
| `npm run db:seed` | Seed/refresh the official accounts |

## Project layout

```
src/app/(site)/       App Router pages: / · /profile/[id] · /standings · /journal · /planner
src/lib/db/           Drizzle schema + Neon client
src/lib/auth.ts       Auth.js (Credentials) config
src/lib/date.ts       todaySG() — the single source of "today" (Asia/Singapore)
src/lib/stats.ts      lostKg / streakDays / progressPct (kg derivations)
src/lib/activity.ts   points / targetPoints / level — how a day's square gets its shade
src/lib/tags.ts       the check-in tags; EXERCISE_TAGS are the ones that score
src/lib/teases.ts     lines shown on a locked (invite-only) profile
src/lib/data.ts       all server reads (every read has a getVisitorX() demo twin)
src/lib/actions.ts    all server actions (mutations)
scripts/seed.ts       Seed the official accounts
drizzle/              Generated SQL migrations
```

## Notes
- **Timezone:** "today"/streak rollover is fixed to **Asia/Singapore** — always use
  `todaySG()` from `src/lib/date.ts`, never a bare `new Date()` for day decisions.
- **Scoring:** a day's shade is its points measured against *that user's own* target, so
  everyone can reach the brightest square by completing their own card. See `src/lib/activity.ts`
  — the rules are pure and unit-tested; don't inline scoring anywhere else.
- **Nothing cosmetic decides a rank.** Boards derive only from real logged data.
- **Profiles are gated**, standings are not: signed-out visitors get generated demo data on
  `/` and `/standings`, and are redirected away from `/profile/*` entirely.
- Deploy to Vercel is a later checkpoint; this currently targets local dev against Neon.
