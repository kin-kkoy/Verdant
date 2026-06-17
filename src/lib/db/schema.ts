import {
  pgTable,
  serial,
  integer,
  text,
  date,
  numeric,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Verdant — Phase 1 schema (the tracker).
 * Game-layer tables (gardens, companions, gifts, races) are deferred to Phase 3+
 * and intentionally NOT defined here.
 *
 * FIREWALL: standings are derived only from `weighIns` (start_weight - latest).
 * Nothing in the schema lets flavor/game state alter the bet.
 *
 * Timezone: "day" columns store the calendar day in the fixed group timezone
 * Asia/Singapore (see src/lib/date.ts → todaySG). No per-user tz column yet.
 */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // optional Google email for quick login / recovery; null for name+password-only accounts
  email: text("email").unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  avatarColor: text("avatar_color").notNull().default("#c2632b"),
  startWeight: numeric("start_weight", { precision: 5, scale: 1 }).notNull(),
  // null = no goal (pure tracking). Defaults to 5 for bet accounts.
  goalKg: numeric("goal_kg", { precision: 4, scale: 1 }).default("5"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per day a user checked in → drives streaks.
export const checkins = pgTable(
  "checkins",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
  },
  (t) => [unique("checkins_user_day").on(t.userId, t.day)],
);

// Weigh-ins — the source of truth for the bet. One per user per day (upsert).
export const weighIns = pgTable(
  "weigh_ins",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    weightKg: numeric("weight_kg", { precision: 5, scale: 1 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("weigh_ins_user_day").on(t.userId, t.day)],
);

// Daily activity log — tags + optional note. One per user per day (upsert).
export const logs = pgTable(
  "logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    note: text("note"),
    tags: text("tags").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("logs_user_day").on(t.userId, t.day)],
);

// Journal — per-user diary entries. `photo` holds a client-downscaled data URL
// for now (Phase 2 local-only); the seam to Vercel Blob is a later swap.
export const diaryEntries = pgTable("diary_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  mood: text("mood").notNull().default("🍂"),
  title: text("title").notNull(),
  body: text("body"),
  photo: text("photo"), // legacy single image (kept for read back-compat)
  photos: text("photos").array().notNull().default([]), // multiple downscaled data URLs
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Planner — per-user timed schedule blocks, scoped to a week. The week-at-a-glance
// and the day×time schedule both render from these rows.
export const planItems = pgTable("plan_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  weekStart: date("week_start").notNull(), // Monday of the week (group TZ)
  dow: integer("dow").notNull(), // 0 = Mon … 6 = Sun
  hour: integer("hour").notNull(), // 0–23
  text: text("text").notNull(),
  color: text("color").notNull().default("var(--accent)"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Access requests — a visitor asks to become an official account. The owner
// approves (creates the account) or dismisses from the /requests admin page.
export const accessRequests = pgTable("access_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contact: text("contact"), // optional, reserved (not collected in the code flow)
  message: text("message"),
  // Claim code the requester keeps to check status & self-create their account.
  code: text("code").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending | approved | dismissed | completed
  approvedAt: timestamp("approved_at", { withTimezone: true }), // set on approve; code expires 14d after
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type WeighIn = typeof weighIns.$inferSelect;
export type Checkin = typeof checkins.$inferSelect;
export type Log = typeof logs.$inferSelect;
export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type PlanItem = typeof planItems.$inferSelect;
export type AccessRequest = typeof accessRequests.$inferSelect;
