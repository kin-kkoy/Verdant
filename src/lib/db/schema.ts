import {
  pgTable,
  serial,
  integer,
  text,
  date,
  numeric,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Verdant — the activity tracker.
 *
 * Meal logging (protein/calories) and workout sessions (exercise → sets → reps)
 * are Phase 2 and intentionally NOT defined here yet. `users.mealsPerDay` is the
 * seam: null means the user isn't tracking meals, which keeps meals out of their
 * contribution-graph target until Phase 2 ships (see src/lib/activity.ts).
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
  // Reminder prefs (Chunk B). reminderMinute = minutes since local midnight the
  // user wants their daily nudge (multiple of 30), null = no time set. timezone is
  // the IANA zone captured from their phone. lastNudgedDay guards against sending
  // twice in one day (group-TZ "YYYY-MM-DD").
  reminderMinute: integer("reminder_minute"),
  // Contribution-graph target: meals the user aims to log per day. null = not
  // tracking meals, so meals are excluded from their target (see activity.ts).
  mealsPerDay: integer("meals_per_day"),
  // Who may open this user's profile page: "everyone" (default) or "invited",
  // which limits it to the people listed in `profileInvites`. The competition on
  // /standings stays public either way — this gates the detail page only.
  profileVisibility: text("profile_visibility").notNull().default("everyone"),
  // Workouts are opt-out. When false the contribution-graph target drops by
  // MAX_WORKOUTS, so someone who only diets can still reach the brightest square
  // on weight + check-in alone (see src/lib/activity.ts).
  tracksWorkouts: boolean("tracks_workouts").notNull().default(true),
  timezone: text("timezone").notNull().default("Asia/Singapore"),
  lastNudgedDay: date("last_nudged_day"),
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

// Web Push subscriptions — one row per browser/device a user enabled reminders on.
// A user can have several (phone + laptop). `endpoint` is globally unique (the push
// service URL); expired ones (410/404 on send) are pruned by the sender.
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  authKey: text("auth_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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

// One row per person an "invited"-mode user has let into their profile. Purely
// one-way: granting access asks nothing of the viewer and is revoked by deleting
// the row. Ignored entirely while the owner's visibility is "everyone".
export const profileInvites = pgTable(
  "profile_invites",
  {
    id: serial("id").primaryKey(),
    // whose profile is being shared
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // who is allowed to see it
    viewerId: integer("viewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("profile_invites_owner_viewer").on(t.ownerId, t.viewerId)],
);

export type ProfileVisibility = "everyone" | "invited";

/**
 * Workouts — a library of exercise cards the user builds, not a session logger.
 *
 * A card is a name, a figure, sets and an amount. Tapping "done" writes an
 * `exerciseLogs` row; the "done 24x" counter on a card is COUNT of those rows,
 * never a stored column — a counter beside dated rows is two truths that drift.
 */

/** What a card counts. Timed moves (Plank, Wall Sit) are seconds, not reps. */
export type ExerciseUnit = "reps" | "seconds";

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Catalogue key (src/lib/exercises/catalog.ts) -> the figure is resolved from
  // /exercises/<slug>/{1,2,3}.png, costing zero database bytes. null = custom.
  slug: text("slug"),
  unit: text("unit").$type<ExerciseUnit>().notNull().default("reps"),
  sets: integer("sets").notNull().default(3),
  amount: integer("amount").notNull().default(10),
  // Only for custom exercises: a client-downscaled data URL, same as diary photos.
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One completion. sets/amount/unit are COPIED at log time — editing a card later
// must not rewrite what you actually did last month.
export const exerciseLogs = pgTable("exercise_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  sets: integer("sets").notNull(),
  amount: integer("amount").notNull(),
  unit: text("unit").$type<ExerciseUnit>().notNull().default("reps"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A named group of cards you can log in one go ("Push day").
export const routines = pgTable("routines", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const routineExercises = pgTable(
  "routine_exercises",
  {
    id: serial("id").primaryKey(),
    routineId: integer("routine_id")
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [unique("routine_exercises_routine_exercise").on(t.routineId, t.exerciseId)],
);

export type User = typeof users.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type ExerciseLog = typeof exerciseLogs.$inferSelect;
export type Routine = typeof routines.$inferSelect;
export type RoutineExercise = typeof routineExercises.$inferSelect;
export type ProfileInvite = typeof profileInvites.$inferSelect;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type WeighIn = typeof weighIns.$inferSelect;
export type Checkin = typeof checkins.$inferSelect;
export type Log = typeof logs.$inferSelect;
export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type PlanItem = typeof planItems.$inferSelect;
export type AccessRequest = typeof accessRequests.$inferSelect;
