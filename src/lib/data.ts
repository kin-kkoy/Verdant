import { and, asc, desc, eq, gte } from "drizzle-orm";
import { db } from "./db";
import { accessRequests, checkins, diaryEntries, exerciseLogs, exercises, logs, planItems, profileInvites, routineExercises, routines, users, weighIns } from "./db/schema";
import type { ExerciseUnit, ProfileVisibility } from "./db/schema";
import { addDaysIso, dayNumber, relativeFromNow, todaySG, weekStartSG } from "./date";
import { daysIn, lostKg, progressPct, round1, streakDays } from "./stats";
import { DEFAULT_TRACKERS, EMPTY_DAY, level, points, type DayActivity, type Trackers } from "./activity";
import { workoutsForDay } from "./workouts";
import { catalogExercise } from "./exercises/catalog";

export type WeightPoint = { day: string; weight: number };

export type Dashboard = {
  mode: "official" | "visitor";
  name: string;
  avatarColor: string;
  startWeight: number;
  goalKg: number | null; // null = no goal (just tracking)
  latestWeight: number | null;
  /** weight before the latest entry, for the "down X since last" line */
  prevWeight: number | null;
  lost: number;
  pct: number | null; // null when there's no goal
  streak: number;
  daysIn: number;
  checkedInToday: boolean;
  todayTags: string[];
  todayNote: string;
  series: WeightPoint[];
};

export type Standing = {
  id: number;
  name: string;
  avatarColor: string;
  lost: number;
  pct: number | null;
  goalKg: number | null;
  streak: number;
  latestWeighInDay: string | null;
  /** Consistency board: days with any activity in the trailing 30-day window. */
  activeDays30: number;
  /** Total activity points over the same window (the tie-breaker). */
  points30: number;
};

/** Days in the trailing window the consistency board ranks on. */
export const STANDINGS_WINDOW = 30;

/** Load everything the landing page needs for one official user. */
export async function getDashboard(userId: number): Promise<Dashboard | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const wis = await db
    .select()
    .from(weighIns)
    .where(eq(weighIns.userId, userId))
    .orderBy(asc(weighIns.day));
  const cis = await db
    .select({ day: checkins.day })
    .from(checkins)
    .where(eq(checkins.userId, userId));
  const today = todaySG();
  const [todayLog] = await db
    .select()
    .from(logs)
    .where(and(eq(logs.userId, userId), eq(logs.day, today)))
    .limit(1);

  const series: WeightPoint[] = wis.map((w) => ({
    day: w.day,
    weight: Number(w.weightKg),
  }));
  const startWeight = Number(user.startWeight);
  const goalKg = user.goalKg == null ? null : Number(user.goalKg);
  const latestWeight = series.length ? series[series.length - 1].weight : null;
  const prevWeight = series.length > 1 ? series[series.length - 2].weight : null;
  const lost = lostKg(startWeight, latestWeight);
  const betStart = todaySG(new Date(user.createdAt));
  const checkinDays = cis.map((c) => c.day);

  return {
    mode: "official",
    name: user.name,
    avatarColor: user.avatarColor,
    startWeight,
    goalKg,
    latestWeight,
    prevWeight,
    lost,
    pct: goalKg == null ? null : progressPct(lost, goalKg),
    streak: streakDays(checkinDays, today),
    daysIn: daysIn(betStart, today),
    checkedInToday: checkinDays.includes(today),
    todayTags: todayLog?.tags ?? [],
    todayNote: todayLog?.note ?? "",
    series,
  };
}

/**
 * Standings for all official users.
 *
 * Ranked by CONSISTENCY (active days, then points, then streak) — the fair
 * measure once workouts are in play, since someone lifting can gain weight while
 * getting leaner. The kilogram figures come along for the `/standings?view=kg`
 * board and are still derived ONLY from real weigh-ins (the firewall).
 *
 * Four queries total, grouped in memory — not one per user.
 */
export async function getStandings(): Promise<Standing[]> {
  const today = todaySG();
  const windowFrom = addDaysIso(today, -(STANDINGS_WINDOW - 1));

  const [allUsers, allWeighIns, allCheckins, windowLogs, windowExerciseLogs] = await Promise.all([
    db.select().from(users).orderBy(asc(users.id)),
    db
      .select({ userId: weighIns.userId, day: weighIns.day, weightKg: weighIns.weightKg })
      .from(weighIns)
      .orderBy(asc(weighIns.day)),
    db.select({ userId: checkins.userId, day: checkins.day }).from(checkins),
    db
      .select({ userId: logs.userId, day: logs.day, tags: logs.tags })
      .from(logs)
      .where(gte(logs.day, windowFrom)),
    db
      .select({
        userId: exerciseLogs.userId,
        day: exerciseLogs.day,
        exerciseId: exerciseLogs.exerciseId,
      })
      .from(exerciseLogs)
      .where(gte(exerciseLogs.day, windowFrom)),
  ]);

  const group = <T extends { userId: number }>(rows: T[]) => {
    const m = new Map<number, T[]>();
    for (const r of rows) {
      const list = m.get(r.userId);
      if (list) list.push(r);
      else m.set(r.userId, [r]);
    }
    return m;
  };
  const weighInsBy = group(allWeighIns);
  const checkinsBy = group(allCheckins);
  const logsBy = group(windowLogs);
  const exerciseLogsBy = group(windowExerciseLogs);

  const rows: Standing[] = allUsers.map((user) => {
    const wis = weighInsBy.get(user.id) ?? [];
    const cis = checkinsBy.get(user.id) ?? [];

    const startWeight = Number(user.startWeight);
    const goalKg = user.goalKg == null ? null : Number(user.goalKg);
    const latest = wis.length ? Number(wis[wis.length - 1].weightKg) : null;
    const lost = lostKg(startWeight, latest);

    // Activity over the trailing window, scored the same way as the graph.
    const byDay = new Map<string, DayActivity>();
    const touch = (day: string): DayActivity => {
      let a = byDay.get(day);
      if (!a) {
        a = { ...EMPTY_DAY };
        byDay.set(day, a);
      }
      return a;
    };
    for (const w of wis) if (w.day >= windowFrom) touch(w.day).weighed = true;
    for (const c of cis) if (c.day >= windowFrom) touch(c.day).checkedIn = true;
    const cardsByDay = new Map<string, number[]>();
    for (const e of exerciseLogsBy.get(user.id) ?? []) {
      const list = cardsByDay.get(e.day);
      if (list) list.push(e.exerciseId);
      else cardsByDay.set(e.day, [e.exerciseId]);
    }
    const tagsByDay = new Map((logsBy.get(user.id) ?? []).map((l) => [l.day, l.tags]));
    for (const day of new Set([...cardsByDay.keys(), ...tagsByDay.keys()])) {
      touch(day).workouts = workoutsForDay(cardsByDay.get(day) ?? [], tagsByDay.get(day) ?? []);
    }
    const dayPoints = [...byDay.values()].map(points);

    return {
      id: user.id,
      name: user.name,
      avatarColor: user.avatarColor,
      lost,
      pct: goalKg == null ? null : progressPct(lost, goalKg),
      goalKg,
      streak: streakDays(
        cis.map((c) => c.day),
        today,
      ),
      latestWeighInDay: wis.length ? wis[wis.length - 1].day : null,
      activeDays30: dayPoints.filter((n) => n > 0).length,
      points30: dayPoints.reduce((n, p) => n + p, 0),
    };
  });

  // Most consistent first; the leader is rows[0].
  return rows.sort(
    (a, b) =>
      b.activeDays30 - a.activeDays30 || b.points30 - a.points30 || b.streak - a.streak,
  );
}

/** Re-rank an existing standings list by kilograms lost (the second board). */
export function byKilograms(rows: Standing[]): Standing[] {
  return [...rows].sort((a, b) => b.lost - a.lost);
}


/**
 * The visitor teaser — static demo data matching the mockup. NOTHING here is
 * persisted; visitor interactions live in client React state only and are wiped
 * on refresh/navigation (NOTES.md hard rule).
 */
export function getVisitorDashboard(): Dashboard {
  const series: WeightPoint[] = [
    { day: "2026-05-01", weight: 84.2 },
    { day: "2026-05-08", weight: 84.0 },
    { day: "2026-05-15", weight: 83.5 },
    { day: "2026-05-22", weight: 83.4 },
    { day: "2026-05-29", weight: 82.8 },
    { day: "2026-06-05", weight: 82.6 },
    { day: "2026-06-12", weight: 82.1 },
    { day: "2026-06-16", weight: 81.9 },
  ];
  return {
    mode: "visitor",
    name: "Guest",
    avatarColor: "#c2632b",
    startWeight: 84.2,
    goalKg: 5,
    latestWeight: 81.9,
    prevWeight: 82.1,
    lost: round1(84.2 - 81.9),
    pct: progressPct(round1(84.2 - 81.9), 5),
    streak: 5,
    daysIn: 47,
    checkedInToday: false,
    todayTags: ["Workout", "Clean eating"],
    todayNote: "",
    series,
  };
}


// ---------- Profiles ----------

export type ProfileUser = {
  id: number;
  name: string;
  avatarColor: string;
  /** Group-TZ day the account was created. */
  joinedDay: string;
  visibility: ProfileVisibility;
  tracksWorkouts: boolean;
};

function asVisibility(v: string): ProfileVisibility {
  return v === "invited" ? "invited" : "everyone";
}

/** The public header of a profile page. Any signed-in user may read any profile. */
export async function getProfileUser(userId: number): Promise<ProfileUser | null> {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      avatarColor: users.avatarColor,
      createdAt: users.createdAt,
      profileVisibility: users.profileVisibility,
      tracksWorkouts: users.tracksWorkouts,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    avatarColor: user.avatarColor,
    joinedDay: todaySG(new Date(user.createdAt)),
    visibility: asVisibility(user.profileVisibility),
    tracksWorkouts: user.tracksWorkouts,
  };
}

/**
 * May `viewerId` open `owner`'s profile?
 *
 * You can always see your own. Otherwise "everyone" is open to any signed-in
 * user, and "invited" needs a `profile_invites` row. There is no owner/admin
 * bypass — a lock that the host can peek through isn't much of a lock.
 */
export async function canViewProfile(
  owner: ProfileUser,
  viewerId: number,
): Promise<boolean> {
  if (owner.id === viewerId) return true;
  if (owner.visibility === "everyone") return true;
  const [row] = await db
    .select({ id: profileInvites.id })
    .from(profileInvites)
    .where(and(eq(profileInvites.ownerId, owner.id), eq(profileInvites.viewerId, viewerId)))
    .limit(1);
  return !!row;
}

/** The user ids `ownerId` has invited into their profile. */
export async function getProfileInvites(ownerId: number): Promise<number[]> {
  const rows = await db
    .select({ viewerId: profileInvites.viewerId })
    .from(profileInvites)
    .where(eq(profileInvites.ownerId, ownerId));
  return rows.map((r) => r.viewerId);
}

/** Everyone with an account, for the profile directory. */
export async function listProfileUsers(): Promise<ProfileUser[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      avatarColor: users.avatarColor,
      createdAt: users.createdAt,
      profileVisibility: users.profileVisibility,
      tracksWorkouts: users.tracksWorkouts,
    })
    .from(users)
    .orderBy(asc(users.id));
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    avatarColor: u.avatarColor,
    joinedDay: todaySG(new Date(u.createdAt)),
    visibility: asVisibility(u.profileVisibility),
    tracksWorkouts: u.tracksWorkouts,
  }));
}

// ---------- Activity calendar (the contribution graph) ----------

export type CalendarDay = {
  day: string; // group-TZ "YYYY-MM-DD"
  points: number;
  level: number; // 0 = empty … 4 = a complete day for this user
};

export type ActivityCalendar = {
  mode: "official" | "visitor";
  /** Oldest → newest, one entry per day in the window (gaps filled with zeroes). */
  days: CalendarDay[];
  /** Inclusive window bounds, so the graph knows where to start its grid. */
  from: string;
  to: string;
  activeDays: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
};

/** Longest run of consecutive days with any points, over an ordered day list. */
function longestRun(days: CalendarDay[]): number {
  let best = 0;
  let run = 0;
  let prevN: number | null = null;
  for (const d of days) {
    const n = dayNumber(d.day);
    if (d.points > 0) {
      run = prevN != null && n === prevN + 1 ? run + 1 : 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
    prevN = n;
  }
  return best;
}

function summarize(
  mode: "official" | "visitor",
  byDay: Map<string, DayActivity>,
  trackers: Trackers,
  from: string,
  to: string,
): ActivityCalendar {
  const days: CalendarDay[] = [];
  for (let d = from; dayNumber(d) <= dayNumber(to); d = addDaysIso(d, 1)) {
    const a = byDay.get(d) ?? EMPTY_DAY;
    days.push({ day: d, points: points(a), level: level(a, trackers) });
  }

  // Current streak: consecutive active days back from today (or yesterday —
  // today isn't over until midnight, same rule as streakDays in stats.ts).
  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].points > 0) currentStreak++;
    else if (i < days.length - 1) break; // an empty day ends it, unless it's today
  }

  return {
    mode,
    days,
    from,
    to,
    activeDays: days.filter((d) => d.points > 0).length,
    totalPoints: days.reduce((n, d) => n + d.points, 0),
    currentStreak,
    longestStreak: longestRun(days),
  };
}

/**
 * A year of day-squares for one official user.
 *
 * Three window-scoped queries, merged in memory — deliberately NOT one query per
 * day. (`getStandings` already has an N+1 loop; this must not add to it.)
 *
 * Phase 1 sources: weigh-ins, check-ins, and the day's exercise tags. Phase 2
 * swaps `workouts` to real workout sessions and fills in `meals`.
 */
export async function getActivityCalendar(
  userId: number,
  windowDays = 365,
): Promise<ActivityCalendar | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const to = todaySG();
  const from = addDaysIso(to, -(windowDays - 1));

  const [wis, cis, lgs, exl] = await Promise.all([
    db
      .select({ day: weighIns.day })
      .from(weighIns)
      .where(and(eq(weighIns.userId, userId), gte(weighIns.day, from))),
    db
      .select({ day: checkins.day })
      .from(checkins)
      .where(and(eq(checkins.userId, userId), gte(checkins.day, from))),
    db
      .select({ day: logs.day, tags: logs.tags })
      .from(logs)
      .where(and(eq(logs.userId, userId), gte(logs.day, from))),
    db
      .select({ day: exerciseLogs.day, exerciseId: exerciseLogs.exerciseId })
      .from(exerciseLogs)
      .where(and(eq(exerciseLogs.userId, userId), gte(exerciseLogs.day, from))),
  ]);

  const byDay = new Map<string, DayActivity>();
  const touch = (day: string): DayActivity => {
    let a = byDay.get(day);
    if (!a) {
      a = { ...EMPTY_DAY };
      byDay.set(day, a);
    }
    return a;
  };
  for (const w of wis) touch(w.day).weighed = true;
  for (const c of cis) touch(c.day).checkedIn = true;

  // Workouts score off whichever evidence is stronger: cards logged that day, or
  // the day's exercise tags (the only source before workout cards existed).
  const cardsByDay = new Map<string, number[]>();
  for (const e of exl) {
    const list = cardsByDay.get(e.day);
    if (list) list.push(e.exerciseId);
    else cardsByDay.set(e.day, [e.exerciseId]);
  }
  const tagsByDay = new Map(lgs.map((l) => [l.day, l.tags]));
  for (const day of new Set([...cardsByDay.keys(), ...tagsByDay.keys()])) {
    touch(day).workouts = workoutsForDay(cardsByDay.get(day) ?? [], tagsByDay.get(day) ?? []);
  }

  const trackers: Trackers = {
    mealsPerDay: user.mealsPerDay,
    tracksWorkouts: user.tracksWorkouts,
  };
  return summarize("official", byDay, trackers, from, to);
}

/**
 * Visitor teaser — a deterministic sample year so the logged-out hero still
 * shows a real-looking graph. Nothing here is persisted (NOTES hard rule).
 */
export function getVisitorActivityCalendar(windowDays = 365): ActivityCalendar {
  const to = todaySG();
  const from = addDaysIso(to, -(windowDays - 1));

  // Deterministic pseudo-random so the demo graph is stable within a day.
  let seed = dayNumber(to) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const byDay = new Map<string, DayActivity>();
  for (let d = from; dayNumber(d) <= dayNumber(to); d = addDaysIso(d, 1)) {
    const r = rand();
    if (r < 0.28) continue; // a rest day
    byDay.set(d, {
      weighed: true,
      checkedIn: r > 0.4,
      meals: 0,
      workouts: r > 0.82 ? 2 : r > 0.62 ? 1 : 0,
    });
  }
  return summarize("visitor", byDay, DEFAULT_TRACKERS, from, to);
}

// ---------- Workouts ----------

export type ExerciseCard = {
  id: number;
  name: string;
  /** Catalogue key, or null for a custom exercise. */
  slug: string | null;
  unit: ExerciseUnit;
  sets: number;
  amount: number;
  /** Data URL for a custom exercise's own picture; null when the slug supplies one. */
  image: string | null;
  /** Muscle group from the catalogue, for grouping and colour. Empty for custom. */
  muscle: string;
  /** How many animation frames the figure has (0 when there's no figure at all). */
  frames: number;
  /** All-time completions — COUNT of exercise_logs, never a stored column. */
  doneCount: number;
  /** Group-TZ day of the most recent completion, or null. */
  lastDay: string | null;
  /** True when this card has already been logged today. */
  doneToday: boolean;
};

export type ExerciseCompletion = {
  id: number;
  exerciseId: number;
  day: string;
  sets: number;
  amount: number;
  unit: ExerciseUnit;
  when: string;
  ts: number;
};

export type RoutineView = {
  id: number;
  name: string;
  exerciseIds: number[];
};

export type WorkoutsView = {
  mode: "official" | "visitor";
  cards: ExerciseCard[];
  /** Recent completions across all cards, newest first (for the card history modals). */
  completions: ExerciseCompletion[];
  routines: RoutineView[];
  tracksWorkouts: boolean;
};

/** Everything /workouts needs for one official user. Five grouped queries. */
export async function getWorkouts(userId: number): Promise<WorkoutsView | null> {
  const [user] = await db
    .select({ tracksWorkouts: users.tracksWorkouts })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) return null;

  const today = todaySG();
  const [rows, allLogs, routineRows, routineLinks] = await Promise.all([
    db.select().from(exercises).where(eq(exercises.userId, userId)).orderBy(asc(exercises.id)),
    db
      .select()
      .from(exerciseLogs)
      .where(eq(exerciseLogs.userId, userId))
      .orderBy(desc(exerciseLogs.createdAt)),
    db.select().from(routines).where(eq(routines.userId, userId)).orderBy(asc(routines.id)),
    db
      .select({
        routineId: routineExercises.routineId,
        exerciseId: routineExercises.exerciseId,
        position: routineExercises.position,
      })
      .from(routineExercises)
      .innerJoin(routines, eq(routines.id, routineExercises.routineId))
      .where(eq(routines.userId, userId))
      .orderBy(asc(routineExercises.position)),
  ]);

  // Counters are derived here rather than stored, so they can never drift.
  const counts = new Map<number, number>();
  const lastDay = new Map<string, string>();
  const doneToday = new Set<number>();
  for (const l of allLogs) {
    counts.set(l.exerciseId, (counts.get(l.exerciseId) ?? 0) + 1);
    const key = String(l.exerciseId);
    const prev = lastDay.get(key);
    if (!prev || l.day > prev) lastDay.set(key, l.day);
    if (l.day === today) doneToday.add(l.exerciseId);
  }

  const cards: ExerciseCard[] = rows.map((r) => {
    const cat = catalogExercise(r.slug);
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      unit: r.unit,
      sets: r.sets,
      amount: r.amount,
      image: r.image,
      muscle: cat?.muscle ?? "",
      frames: cat?.frames ?? (r.image ? 1 : 0),
      doneCount: counts.get(r.id) ?? 0,
      lastDay: lastDay.get(String(r.id)) ?? null,
      doneToday: doneToday.has(r.id),
    };
  });

  const byRoutine = new Map<number, number[]>();
  for (const link of routineLinks) {
    const list = byRoutine.get(link.routineId);
    if (list) list.push(link.exerciseId);
    else byRoutine.set(link.routineId, [link.exerciseId]);
  }

  return {
    mode: "official",
    cards,
    completions: allLogs.slice(0, 400).map((l) => ({
      id: l.id,
      exerciseId: l.exerciseId,
      day: l.day,
      sets: l.sets,
      amount: l.amount,
      unit: l.unit,
      when: relativeFromNow(new Date(l.createdAt)),
      ts: new Date(l.createdAt).getTime(),
    })),
    routines: routineRows.map((r) => ({
      id: r.id,
      name: r.name,
      exerciseIds: byRoutine.get(r.id) ?? [],
    })),
    tracksWorkouts: user.tracksWorkouts,
  };
}

/** Visitor teaser — in-memory only, nothing persisted (NOTES hard rule). */
export function getVisitorWorkouts(): WorkoutsView {
  const today = todaySG();
  return {
    mode: "visitor",
    cards: [
      { id: -1, name: "Push-up", slug: "push-up", unit: "reps", sets: 3, amount: 15,
        image: null, muscle: "Chest", frames: 3, doneCount: 24, lastDay: today, doneToday: true },
      { id: -2, name: "Plank", slug: "plank", unit: "seconds", sets: 3, amount: 45,
        image: null, muscle: "Core", frames: 3, doneCount: 18, lastDay: today, doneToday: false },
      { id: -3, name: "Squat", slug: "squat", unit: "reps", sets: 4, amount: 12,
        image: null, muscle: "Quads", frames: 3, doneCount: 11, lastDay: addDaysIso(today, -2),
        doneToday: false },
    ],
    completions: [
      { id: -101, exerciseId: -1, day: today, sets: 3, amount: 15, unit: "reps",
        when: "2 hrs ago", ts: Date.now() - 7_200_000 },
      { id: -102, exerciseId: -2, day: addDaysIso(today, -1), sets: 3, amount: 45,
        unit: "seconds", when: "yesterday", ts: Date.now() - 90_000_000 },
    ],
    routines: [{ id: -1, name: "Morning set", exerciseIds: [-1, -2] }],
    tracksWorkouts: true,
  };
}

// ---------- Journal (per-user) ----------

export type JournalEntry = {
  id: number;
  mood: string;
  title: string;
  body: string | null;
  photos: string[];
  when: string;
  ts: number;
};

export type LogView = {
  id: number;
  day: string;
  tags: string[];
  note: string | null;
  when: string;
  ts: number;
};

export async function getDiaryEntries(userId: number): Promise<JournalEntry[]> {
  const rows = await db
    .select()
    .from(diaryEntries)
    .where(eq(diaryEntries.userId, userId))
    .orderBy(desc(diaryEntries.createdAt));
  return rows.map((r) => ({
    id: r.id,
    mood: r.mood,
    title: r.title,
    body: r.body,
    // Merge legacy single photo with the photos array.
    photos: [...(r.photos ?? []), ...(r.photo ? [r.photo] : [])],
    when: relativeFromNow(new Date(r.createdAt)),
    ts: new Date(r.createdAt).getTime(),
  }));
}

/** Daily activity logs (check-in tags + note) that have content, recent first. */
export async function getActivityLogs(userId: number): Promise<LogView[]> {
  const rows = await db
    .select()
    .from(logs)
    .where(eq(logs.userId, userId))
    .orderBy(desc(logs.day));
  return rows
    .filter((r) => (r.tags && r.tags.length > 0) || (r.note && r.note.trim()))
    .map((r) => ({
      id: r.id,
      day: r.day,
      tags: r.tags ?? [],
      note: r.note,
      when: relativeFromNow(new Date(r.createdAt)),
      ts: new Date(r.createdAt).getTime(),
    }));
}

export function getVisitorDiary(): JournalEntry[] {
  return [
    { id: -1, mood: "🍂", title: "Week 6 check", body: "Down a full 3.6 kg and the morning walks are a ritual now. Lit the fire early.", photos: [], when: "2 days ago", ts: Date.parse("2026-06-15") },
    { id: -2, mood: "💪", title: "Reset day", body: "Slipped over the weekend, back on it Monday. Logged it honestly — that is the point.", photos: [], when: "5 days ago", ts: Date.parse("2026-06-12") },
    { id: -3, mood: "🌰", title: "New trail", body: "Found a leaf-covered loop by the creek. Could do it every morning.", photos: [], when: "9 days ago", ts: Date.parse("2026-06-08") },
  ];
}

export function getVisitorLogs(): LogView[] {
  return [
    { id: -101, day: "2026-06-16", tags: ["Workout", "Clean eating"], note: "Felt strong on the morning lift.", when: "yesterday", ts: Date.parse("2026-06-16") },
    { id: -102, day: "2026-06-14", tags: ["Walk", "Water"], note: null, when: "3 days ago", ts: Date.parse("2026-06-14") },
  ];
}

// ---------- Planner (per-user, current week) ----------

export type PlanBlock = { id: number; dow: number; hour: number; text: string; color: string };

export async function getPlanBlocks(
  userId: number,
  weekStart: string = weekStartSG(),
): Promise<PlanBlock[]> {
  const rows = await db
    .select()
    .from(planItems)
    .where(and(eq(planItems.userId, userId), eq(planItems.weekStart, weekStart)))
    .orderBy(asc(planItems.hour));
  return rows.map((r) => ({ id: r.id, dow: r.dow, hour: r.hour, text: r.text, color: r.color }));
}

export function getVisitorPlan(): PlanBlock[] {
  return [
    { id: -1, dow: 0, hour: 7, text: "Upper body", color: "var(--accent)" },
    { id: -2, dow: 2, hour: 9, text: "5k run", color: "var(--rust)" },
    { id: -3, dow: 4, hour: 11, text: "Spin", color: "var(--olive)" },
    { id: -4, dow: 5, hour: 13, text: "Long hike", color: "var(--gold)" },
    { id: -5, dow: 5, hour: 8, text: "Weigh-in", color: "var(--accent)" },
  ];
}

// ---------- Access requests (admin) ----------

export type AccessRequestView = {
  id: number;
  name: string;
  message: string | null;
  code: string;
  status: string;
  expired: boolean;
  when: string;
};

const CODE_TTL_MS = 14 * 86_400_000;

export async function getAccessRequests(): Promise<AccessRequestView[]> {
  const rows = await db.select().from(accessRequests).orderBy(desc(accessRequests.createdAt));
  // Pending first, then most-recent handled.
  const order = (s: string) => (s === "pending" ? 0 : 1);
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      message: r.message,
      code: r.code,
      status: r.status,
      expired:
        r.status === "approved" && r.approvedAt
          ? Date.now() - new Date(r.approvedAt).getTime() > CODE_TTL_MS
          : false,
      when: relativeFromNow(new Date(r.createdAt)),
    }))
    .sort((a, b) => order(a.status) - order(b.status));
}

export async function getPendingRequestCount(): Promise<number> {
  const rows = await db
    .select({ id: accessRequests.id })
    .from(accessRequests)
    .where(eq(accessRequests.status, "pending"));
  return rows.length;
}

export function getVisitorStandings(): Standing[] {
  return [
    {
      id: -1,
      name: "Mei",
      avatarColor: "#b1556c",
      lost: 3.6,
      pct: 72,
      goalKg: 5,
      streak: 9,
      latestWeighInDay: "2026-06-15",
      activeDays30: 24,
      points30: 71,
    },
    {
      id: -2,
      name: "You",
      avatarColor: "#c2632b",
      lost: 2.3,
      pct: 46,
      goalKg: 5,
      streak: 5,
      latestWeighInDay: "2026-06-17",
      activeDays30: 19,
      points30: 52,
    },
  ];
}
