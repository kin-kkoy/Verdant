# Verdant

A private, cozy-cabin tracker for a friendly 5 kg weight-loss bet between two friends
(expandable to ~5). Built with Next.js (App Router) + Neon Postgres + Drizzle + Auth.js.

> Design, decisions, and roadmap live in `docs/` and `BUILD-PLAN.md`. The canonical look
> is `prototypes/premium-mockup.html`.

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

4. **Seed the two official accounts** — first edit the `OFFICIAL_ACCOUNTS` array at the top of
   `scripts/seed.ts` (names, start weights, passwords are placeholders), then:
   ```bash
   npm run db:seed
   ```

5. **Run it**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000 → you'll be sent to `/login`. Sign in with a seeded account to
   see the Phase 0 "signed in" proof page.

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
src/app/            App Router pages (/, /login, /hello, api/auth)
src/lib/db/         Drizzle schema + Neon client
src/lib/auth.ts     Auth.js (Credentials) config
src/lib/date.ts     todaySG() — the single source of "today" (Asia/Singapore)
src/lib/stats.ts    lostKg / streakDays / progressPct (the firewall lives here)
scripts/seed.ts     Seed the two official accounts
drizzle/            Generated SQL migrations
```

## Notes
- **Timezone:** "today"/streak rollover is fixed to **Asia/Singapore** — always use
  `todaySG()` from `src/lib/date.ts`, never a bare `new Date()` for day decisions.
- **The firewall:** standings derive only from real weigh-ins (`src/lib/stats.ts`). No
  game/flavor value ever decides the bet.
- Deploy to Vercel is a later checkpoint; this currently targets local dev against Neon.
